import { Router } from "express";
import { z } from "zod";
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

async function findConfirmedPayment(senderAddress: string, receiverAddress: string, expectedNano: bigint, expectedComment: string) {
  const encodedSender = encodeURIComponent(senderAddress);
  const data = await tonApi(`/v2/blockchain/accounts/${encodedSender}/transactions?limit=30`);
  const transactions = Array.isArray(data?.transactions) ? data.transactions : [];

  for (const tx of transactions) {
    if (tx?.description?.aborted) continue;
    for (const msg of Array.isArray(tx?.out_msgs) ? tx.out_msgs : []) {
      if (!msg || msg.bounced) continue;
      if (BigInt(msg.value ?? "0") !== expectedNano) continue;
      const decoded = msg.message_content?.decoded;
      if (decoded?.type !== "text_comment" || decoded.comment !== expectedComment) continue;
      const destination = msg.destination;
      const friendly = destination && data?.address_book?.[destination]?.user_friendly;
      if (friendly !== receiverAddress && destination !== receiverAddress) continue;
      return { txHash: String(tx.hash), lt: String(tx.lt), now: Number(tx.now ?? 0) };
    }
  }
  return null;
}

shopRouter.get("/", async (_req, res) => {
  try {
    const { data: dbTiers } = await supabaseAdmin.from("shop_tiers").select("*").eq("active", true).order("price_ton", { ascending: true });
    const tiers = dbTiers && dbTiers.length > 0
      ? dbTiers.map((t: any) => ({ id: t.id, label: t.label, novaPower: Number(t.nova_power), priceTon: Number(t.price_ton), dailyTon: Number(t.daily_ton ?? 0), monthTon: Number(t.month_ton ?? 0), hot: !!t.hot }))
      : SHOP.TIERS;
    res.json({ tiers, walletAddress: process.env.TON_WALLET_ADDRESS ?? "" });
  } catch {
    res.json({ tiers: SHOP.TIERS, walletAddress: process.env.TON_WALLET_ADDRESS ?? "" });
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
    if (!receiverAddress) return res.status(503).json({ error: "TON receiving wallet is not configured on the server." });
    if (!/^UQ[A-Za-z0-9_-]+$|^EQ[A-Za-z0-9_-]+$/.test(senderAddress)) return res.status(400).json({ error: "Invalid TON wallet address" });

    const expectedPrefix = `EarnX Shop|${userId}|${tierId}|`;
    if (!paymentComment.startsWith(expectedPrefix)) return res.status(400).json({ error: "Payment reference does not belong to this account" });

    let tier: any = null;
    const { data: dbTier } = await supabaseAdmin.from("shop_tiers").select("*").eq("id", tierId).maybeSingle();
    if (dbTier) tier = { id: dbTier.id, priceTon: Number(dbTier.price_ton), novaPower: Number(dbTier.nova_power) };
    else tier = SHOP.TIERS.find((t) => t.id === tierId);
    if (!tier) return res.status(404).json({ error: "Unknown tier" });

    const expectedNano = BigInt(Math.round(Number(tier.priceTon) * 1_000_000_000));
    let payment = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      payment = await findConfirmedPayment(senderAddress, receiverAddress, expectedNano, paymentComment);
      if (payment) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    if (!payment) return res.status(202).json({ status: "pending", error: "Payment was sent, but TON is still indexing it. Please reopen Shop in a few seconds." });

    const { data: existing } = await supabaseAdmin.from("shop_purchases").select("id,status").eq("tx_hash", payment.txHash).maybeSingle();
    if (existing) return res.status(409).json({ error: "This TON transaction was already credited." });

    const { data: purchase, error: purchaseErr } = await supabaseAdmin.from("shop_purchases").insert({
      user_id: userId, tier_id: tier.id, nova_granted: tier.novaPower, ton_paid: tier.priceTon, tx_hash: payment.txHash, status: "confirmed", confirmed_at: new Date().toISOString(),
    }).select("id,status").single();
    if (purchaseErr) throw purchaseErr;

    const { data: newNova, error: rpcErr } = await supabaseAdmin.rpc("increment_user_nova", { p_user_id: userId, p_amount: tier.novaPower });
    if (rpcErr) throw rpcErr;
    const newMiningPower = miningPowerFromNova(Number(newNova ?? tier.novaPower));
    const { error: powerErr } = await supabaseAdmin.from("users").update({ mining_power: newMiningPower }).eq("id", userId);
    if (powerErr) throw powerErr;

    await supabaseAdmin.from("activity_feed").insert({ user_id: userId, type: "buy", payload: { tier_id: tier.id, nova_granted: tier.novaPower, ton_paid: tier.priceTon, tx_hash: payment.txHash } });
    res.json({ purchaseId: purchase.id, status: "confirmed", txHash: payment.txHash, nova: Number(newNova), miningPower: newMiningPower });
  } catch (err) {
    next(err);
  }
});
