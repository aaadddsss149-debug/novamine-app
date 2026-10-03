import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { miningPowerFromNova } from "@earnx/shared";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).auth!.sub;

    // Run the four required queries in parallel.
    const [
      { data: user, error },
      { data: session },
      { count: qualifiedFriends },
      { count: totalReferred },
    ] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, telegram_id, username, first_name, last_name, photo_url, nova, hashes, ton_balance, daily_rate, mining_power, gift_claimed, created_at")
        .eq("id", userId)
        .single(),

      supabaseAdmin
        .from("mining_sessions")
        .select("id, started_at, claim_ready_at, claimed_at")
        .eq("user_id", userId)
        .is("claimed_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", userId)
        .eq("status", "active"),

      supabaseAdmin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", userId),
    ]);

    if (error) throw error;

    res.json({
      user,
      mining: session ? {
        sessionId: session.id,
        startedAt: session.started_at,
        claimReadyAt: session.claim_ready_at,
        claimable: session.claim_ready_at
          ? new Date(session.claim_ready_at).getTime() <= Date.now()
          : false,
      } : null,
      referrals: {
        total: totalReferred ?? 0,
        qualified: qualifiedFriends ?? 0,
        requiredForWithdraw: 5,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /me/mining-power — called automatically by the frontend when NOVA changes.
// Re-calculates the correct power from the user's current NOVA balance in the DB
// (we don't trust the client value — we re-derive it server-side).
meRouter.patch("/mining-power", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).auth!.sub;

    // Fetch current NOVA from DB (source of truth)
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("nova")
      .eq("id", userId)
      .single();
    if (error) throw error;

    const correctPower = miningPowerFromNova(user.nova);

    await supabaseAdmin
      .from("users")
      .update({ mining_power: correctPower })
      .eq("id", userId);

    res.json({ mining_power: correctPower });
  } catch (err) {
    next(err);
  }
});

// ── GET /me/config ────────────────────────────────────────────────────────────
// Returns user-facing config values (min withdraw, etc) — no admin secret needed.
meRouter.get("/config", requireAuth, async (_req: any, res: any, next: any) => {
  try {
    const { data } = await supabaseAdmin.from("app_config")
      .select("key,value")
      .in("key", ["welcome_ton", "referral_ton", "min_withdraw_ton"]);
    const cfg: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
    res.json({
      minWithdrawTon: Number(cfg.min_withdraw_ton ?? 2.0),
      welcomeTon:     Number(cfg.welcome_ton      ?? 1.5),
      referralTon:    Number(cfg.referral_ton      ?? 0.005),
    });
  } catch (err) { next(err); }
});
