import { Router } from "express";
import { z } from "zod";
import { Address } from "@ton/core";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { SHOP, miningPowerFromNova } from "@earnx/shared";

export const shopRouter = Router();

const TON_API_BASE = process.env.TON_API_BASE_URL ?? "https://tonapi.io";
const TON_API_KEY = process.env.TON_API_KEY ?? "";

async function tonApi(path: string) {
  const headers: Record<string, string> = { accept: "application/json" };
  if (TON_API_KEY) headers.authorization = `Bearer ${TON_API_KEY}`;
  const response = await fetch(`${TON_API_BASE}${path}`, { headers });
  if (!response.ok) throw new Error(`TON API returned HTTP ${response.status}`);
  return response.json() as Promise<any>;
}

function rawTonAddress(address: string) {
  return Address.parse(address).toRawString();
}

async function findConfirmedPayment(
  senderAddress: string,
  receiverAddress: string,
  expectedNano: bigint,
  expectedComment: string,
  notBeforeUnix: number,
) {
  const senderRaw = rawTonAddress(senderAddress);

  // Read the receiver's indexed account events. This is more reliable than
  // scanning the sender's low-level transactions because TonAPI exposes the
  // parsed TonTransfer comment directly here.
  const encodedReceiver = encodeURIComponent(receiverAddress);
  const data = await tonApi(`/v2/accounts/${encodedReceiver}/events?limit=50`);
  const events = Array.isArray(data?.events) ? data.events : [];

  for (const event of events) {
    for (const action of Array.isArray(event?.actions) ? event.actions : []) {
      if (action?.status && action.status !== "ok") continue;

      const transfer =
        action?.TonTransfer ??
        action?.ton_transfer ??
        action?.details?.TonTransfer ??
        (action?.type === "TonTransfer" ? action?.details : null);

      if (!transfer) continue;

      const amount = BigInt(String(transfer.amount ?? "0"));
      const comment = transfer.comment == null ? "" : String(transfer.comment);
      const senderRawEvent = transfer.sender?.address ? String(transfer.sender.address) : "";

      if (amount !== expectedNano) continue;
      if (comment !== expectedComment) continue;
      if (senderRawEvent !== senderRaw) continue;
      if (Number(event?.timestamp ?? 0) < notBeforeUnix) continue;
      if (!event?.event_id && !event?.id) continue;

      return {
        txHash: String(event?.event_id ?? event?.id ?? ""),
        lt: String(event?.lt ?? ""),
        now: Number(event?.timestamp ?? 0),
      };
    }
  }

  return null;
}

shopRouter.get("/", async (_req, res) => {
  try {
    const { data: dbTiers } = await supabaseAdmin
      .from("shop_tiers")
      .select("*")
      .eq("active", true)
      .order("price_ton", { ascending: true });

    const tiers =
      dbTiers && dbTiers.length > 0
        ? dbTiers.map((t: any) => ({
            id: t.id,
            label: t.label,
            novaPower: Number(t.nova_power),
            priceTon: Number(t.price_ton),
            dailyTon: Number(t.daily_ton ?? 0),
            monthTon: Number(t.month_ton ?? 0),
            hot: !!t.hot,
          }))
        : SHOP.TIERS;

    res.json({
      tiers,
      walletAddress: process.env.TON_WALLET_ADDRESS ?? "",
    });
  } catch {
    res.json({
      tiers: SHOP.TIERS,
      walletAddress: process.env.TON_WALLET_ADDRESS ?? "",
    });
  }
});

const BuyBody = z.object({
  tierId: z.string().min(1),
  senderAddress: z.string().min(20).max(100),
  paymentComment: z.string().min(20).max(200),
});

shopRouter.post("/buy", requireAuth, async (req, res, next) => {
  try {
    const { tierId, senderAddress, paymentComment } = BuyBody.parse(req.body);
    const userId = (req as any).auth!.sub;
    const receiverAddress = process.env.TON_WALLET_ADDRESS?.trim();

    if (!receiverAddress) {
      return res.status(503).json({
        error: "TON receiving wallet is not configured on the server.",
      });
    }

    let senderRaw: string;
    try {
      senderRaw = rawTonAddress(senderAddress);
    } catch {
      return res.status(400).json({ error: "Invalid TON wallet address" });
    }

    const expectedPrefix = `EarnX Shop|${userId}|${tierId}|`;
    if (!paymentComment.startsWith(expectedPrefix)) {
      return res.status(400).json({
        error: "Payment reference does not belong to this account",
      });
    }

    let tier: any = null;
    const { data: dbTier } = await supabaseAdmin
      .from("shop_tiers")
      .select("*")
      .eq("id", tierId)
      .maybeSingle();

    if (dbTier) {
      tier = {
        id: dbTier.id,
        priceTon: Number(dbTier.price_ton),
        novaPower: Number(dbTier.nova_power),
      };
    } else {
      tier = SHOP.TIERS.find((t) => t.id === tierId);
    }

    if (!tier) return res.status(404).json({ error: "Unknown tier" });

    const expectedNano = BigInt(
      Math.round(Number(tier.priceTon) * 1_000_000_000),
    );

    let payment = null;
    const paymentAttemptStartedAt = Math.floor(Date.now() / 1000) - 30;

    // Public TonAPI is rate-limited. Poll at ~4.2s intervals instead of
    // hammering it every 2s and getting 429 responses.
    for (let attempt = 0; attempt < 4; attempt++) {
      payment = await findConfirmedPayment(
        senderAddress,
        receiverAddress,
        expectedNano,
        paymentComment,
        paymentAttemptStartedAt,
      );

      if (payment) break;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 4200));
      }
    }

    if (!payment) {
      return res.status(202).json({
        status: "pending",
        error:
          "Payment was sent, but TON is still indexing it. Please wait a few seconds and try Shop again.",
      });
    }

    const { data: existing } = await supabaseAdmin
      .from("shop_purchases")
      .select("id,status")
      .eq("tx_hash", payment.txHash)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: "This TON transaction was already credited.",
      });
    }

    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("shop_purchases")
      .insert({
        user_id: userId,
        tier_id: tier.id,
        nova_granted: tier.novaPower,
        ton_paid: tier.priceTon,
        tx_hash: payment.txHash,
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
      })
      .select("id,status")
      .single();

    if (purchaseErr) throw purchaseErr;

    const { data: newNova, error: rpcErr } = await supabaseAdmin.rpc(
      "increment_user_nova",
      { p_user_id: userId, p_amount: tier.novaPower },
    );

    if (rpcErr) throw rpcErr;

    const newMiningPower = miningPowerFromNova(
      Number(newNova ?? tier.novaPower),
    );

    const { error: powerErr } = await supabaseAdmin
      .from("users")
      .update({ mining_power: newMiningPower })
      .eq("id", userId);

    if (powerErr) throw powerErr;

    await supabaseAdmin.from("activity_feed").insert({
      user_id: userId,
      type: "buy",
      payload: {
        tier_id: tier.id,
        nova_granted: tier.novaPower,
        ton_paid: tier.priceTon,
        tx_hash: payment.txHash,
      },
    });

    res.json({
      purchaseId: purchase.id,
      status: "confirmed",
      txHash: payment.txHash,
      nova: Number(newNova),
      miningPower: newMiningPower,
    });
  } catch (err) {
    next(err);
  }
});
