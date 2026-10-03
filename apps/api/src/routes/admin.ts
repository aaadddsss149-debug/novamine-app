// apps/api/src/routes/admin.ts
// Admin API — protected by ADMIN_SECRET. Never expose Supabase service keys to the browser.

import crypto from "node:crypto";
import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase.js";

export const adminRouter = Router();

function getAdminSecret(req: any): string {
  const value = req.headers["x-admin-secret"];
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requireAdmin(req: any, res: any, next: any) {
  const expected = process.env.ADMIN_SECRET?.trim();

  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: "ADMIN_SECRET is not configured on the API server",
      code: "ADMIN_NOT_CONFIGURED",
    });
  }

  const provided = getAdminSecret(req);
  if (!provided || !secretsMatch(provided, expected)) {
    return res.status(401).json({ ok: false, error: "Unauthorized", code: "ADMIN_UNAUTHORIZED" });
  }

  next();
}

adminRouter.post("/login", (req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store");

  const expected = process.env.ADMIN_SECRET?.trim();
  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: "ADMIN_SECRET is not configured on the API server. Add it to Render → novamine-api → Environment.",
      code: "ADMIN_NOT_CONFIGURED",
    });
  }

  const provided = typeof req.body?.secret === "string" ? req.body.secret : "";
  if (!provided || !secretsMatch(provided, expected)) {
    return res.status(401).json({
      ok: false,
      error: "Wrong admin password",
      code: "ADMIN_WRONG_PASSWORD",
    });
  }

  return res.json({ ok: true });
});

// Lightweight server-side verification for the admin UI.
adminRouter.get("/verify", requireAdmin, (_req: any, res: any) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true });
});

// ── Analytics ───────────────────────────────────────────────────────────────
adminRouter.get("/analytics", requireAdmin, async (_req: any, res: any) => {
  // Analytics must remain available even if one optional table/query is missing
  // from the production schema. Return each dataset independently and expose
  // query errors for diagnostics instead of turning the whole dashboard into
  // a blank/error state.
  const result: any = {
    users: [],
    purchases: [],
    withdrawals: [],
    sessions: [],
    errors: {},
  };

  const queries: Array<[string, any]> = [
    ["users", supabaseAdmin.from("users").select("id,telegram_id,username,first_name,last_name,nova,hashes,ton_balance,mining_power,created_at,last_seen_at")] as const,
    ["purchases", supabaseAdmin.from("shop_purchases").select("ton_paid,status,created_at")] as const,
    ["withdrawals", supabaseAdmin.from("withdrawals").select("amount_ton,status")] as const,
    ["sessions", supabaseAdmin.from("mining_sessions").select("id,claimed_at").not("claimed_at", "is", null)] as const,
  ];

  for (const [name, query] of queries) {
    try {
      const { data, error } = await query;
      if (error) {
        result.errors[name] = { message: error.message, code: error.code };
      } else {
        result[name] = Array.isArray(data) ? data : [];
      }
    } catch (e: any) {
      result.errors[name] = { message: e?.message || "Unknown query error" };
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(result);
});

// ── Users ───────────────────────────────────────────────────────────────────
adminRouter.get("/users", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id,telegram_id,username,first_name,nova,ton_balance,mining_power,created_at,last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.patch("/users/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { nova, ton_balance, mining_power } = req.body;
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        nova: Number(nova),
        ton_balance: Number(ton_balance),
        mining_power: Number(mining_power),
      })
      .eq("id", id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Withdrawals ─────────────────────────────────────────────────────────────
adminRouter.get("/withdrawals", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("withdrawals")
      .select("id,user_id,amount_ton,wallet_address,status,tx_hash,requested_at,notes")
      .order("requested_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = [...new Set((data ?? []).map((r: any) => r.user_id))];
    const userMap: Record<string, any> = {};
    if (ids.length) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id,username,first_name,telegram_id")
        .in("id", ids);
      (users ?? []).forEach((u: any) => { userMap[u.id] = u; });
    }
    res.json({ withdrawals: data ?? [], userMap });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.patch("/withdrawals/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("withdrawals")
      .select("user_id,amount_ton,status")
      .eq("id", id)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: "Not found" });
    if (row.status !== "pending") return res.status(400).json({ error: "Already processed" });

    if (action === "approve") {
      const { error } = await supabaseAdmin.from("withdrawals")
        .update({ status: "sent", processed_at: new Date().toISOString(), notes: notes ?? null })
        .eq("id", id);
      if (error) throw error;
    } else if (action === "reject") {
      const { data: user, error: userErr } = await supabaseAdmin
        .from("users").select("ton_balance").eq("id", row.user_id).single();
      if (userErr) throw userErr;

      if (user) {
        const { error: refundErr } = await supabaseAdmin.from("users")
          .update({ ton_balance: Number(user.ton_balance) + Number(row.amount_ton) })
          .eq("id", row.user_id);
        if (refundErr) throw refundErr;
      }

      const { error } = await supabaseAdmin.from("withdrawals")
        .update({ status: "rejected", notes: notes ?? null, processed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Shop Purchases ──────────────────────────────────────────────────────────
adminRouter.get("/purchases", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("shop_purchases")
      .select("id,user_id,tier_id,nova_granted,ton_paid,tx_hash,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = [...new Set((data ?? []).map((r: any) => r.user_id))];
    const userMap: Record<string, any> = {};
    if (ids.length) {
      const { data: users } = await supabaseAdmin
        .from("users")
        .select("id,username,first_name,telegram_id,nova,mining_power")
        .in("id", ids);
      (users ?? []).forEach((u: any) => { userMap[u.id] = u; });
    }
    res.json({ purchases: data ?? [], userMap });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.patch("/purchases/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const { data: row, error } = await supabaseAdmin
      .from("shop_purchases")
      .select("user_id,nova_granted,status")
      .eq("id", id)
      .single();

    if (error || !row) return res.status(404).json({ error: "Not found" });
    if (row.status !== "pending") return res.status(400).json({ error: "Already processed" });

    if (action === "confirm") {
      const { data: user, error: userErr } = await supabaseAdmin
        .from("users").select("nova,mining_power").eq("id", row.user_id).single();
      if (userErr) throw userErr;

      if (user) {
        const { error: updateErr } = await supabaseAdmin.from("users").update({
          nova: Number(user.nova) + Number(row.nova_granted),
          mining_power: Number(user.mining_power) + Number(row.nova_granted),
        }).eq("id", row.user_id);
        if (updateErr) throw updateErr;
      }

      const { error: statusErr } = await supabaseAdmin.from("shop_purchases")
        .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
        .eq("id", id);
      if (statusErr) throw statusErr;
    } else if (action === "reject") {
      const { error: statusErr } = await supabaseAdmin.from("shop_purchases")
        .update({ status: "rejected" }).eq("id", id);
      if (statusErr) throw statusErr;
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Tasks Manager ──────────────────────────────────────────────────────────
adminRouter.get("/tasks", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.post("/tasks", requireAdmin, async (req: any, res: any) => {
  try {
    const { id, label, reward, action, url, category, active } = req.body ?? {};
    if (!id || !label) return res.status(400).json({ error: "id and label are required" });
    const row = { id: String(id).trim(), label: String(label).trim(), reward: Math.max(0, Math.floor(Number(reward ?? 0))), action: String(action || "Open"), url: url ? String(url).trim() : null, category: String(category || "TG TASKS"), active: active !== false, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseAdmin.from("tasks").insert(row).select("*").single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.patch("/tasks/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const updates: any = {};
    for (const key of ["label","action","url","category"]) if (req.body?.[key] !== undefined) updates[key] = req.body[key] === null ? null : String(req.body[key]);\n    if (req.body?.active !== undefined) updates.active = Boolean(req.body.active);
    if (req.body?.reward !== undefined) updates.reward = Math.max(0, Math.floor(Number(req.body.reward)));
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("tasks").update(updates).eq("id", req.params.id).select("*").single();
    if (error) throw error;
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

adminRouter.delete("/tasks/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Ad Config ───────────────────────────────────────────────────────────────
adminRouter.get("/ad-config", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin.from("app_config")
      .select("key,value").in("key", ["ads_enabled", "ad_triggers", "adsgram_block_id"]);
    if (error) throw error;

    const cfg: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
    res.json({
      adsEnabled: cfg.ads_enabled ?? true,
      adTriggers: cfg.ad_triggers ?? { start_mining: true, collect_mining: true, spin_slot: true, dice_roll: true },
      adBlockId: typeof cfg.adsgram_block_id === "string" ? cfg.adsgram_block_id : "",
    });
  } catch {
    res.json({ adsEnabled: false, adTriggers: {}, adBlockId: "" });
  }
});

adminRouter.patch("/ad-config", requireAdmin, async (req: any, res: any) => {
  try {
    const { adsEnabled, adTriggers, adBlockId } = req.body;
    if (typeof adsEnabled !== "boolean" || typeof adTriggers !== "object") {
      return res.status(400).json({ error: "Invalid ad configuration" });
    }
    if (adBlockId !== undefined && typeof adBlockId !== "string") {
      return res.status(400).json({ error: "Invalid AdsGram block id" });
    }
    const { error: e1 } = await supabaseAdmin.from("app_config").upsert({ key: "ads_enabled", value: adsEnabled });
    const { error: e2 } = await supabaseAdmin.from("app_config").upsert({ key: "ad_triggers", value: adTriggers });
    const { error: e3 } = await supabaseAdmin.from("app_config").upsert({ key: "adsgram_block_id", value: String(adBlockId ?? "") });
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Reward Config ────────────────────────────────────────────────────────────
adminRouter.get("/reward-config", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin.from("app_config")
      .select("key,value").in("key", ["welcome_ton", "referral_ton", "min_withdraw_ton"]);
    if (error) throw error;

    const cfg: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
    res.json({
      welcomeTon: Number(cfg.welcome_ton ?? 1.5),
      referralTon: Number(cfg.referral_ton ?? 0.005),
      minWithdrawTon: Number(cfg.min_withdraw_ton ?? 2.0),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.patch("/reward-config", requireAdmin, async (req: any, res: any) => {
  try {
    const updates = [
      { key: "welcome_ton", value: Number(req.body?.welcomeTon) },
      { key: "referral_ton", value: Number(req.body?.referralTon) },
      { key: "min_withdraw_ton", value: Number(req.body?.minWithdrawTon) },
    ];

    if (updates.some((u) => !Number.isFinite(u.value) || u.value < 0)) {
      return res.status(400).json({ error: "Invalid reward settings" });
    }

    for (const u of updates) {
      const { error } = await supabaseAdmin.from("app_config").upsert(u);
      if (error) throw error;
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── Shop Tiers ──────────────────────────────────────────────────────────────
adminRouter.get("/shop-tiers", requireAdmin, async (_req: any, res: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("shop_tiers")
      .select("*")
      .order("price_ton", { ascending: true });
    if (error) throw error;
    res.json(data ?? []);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

adminRouter.put("/shop-tiers", requireAdmin, async (req: any, res: any) => {
  try {
    const { tiers } = req.body;
    if (!Array.isArray(tiers)) return res.status(400).json({ error: "tiers must be an array" });

    const rows = tiers.map((t: any) => ({
      id: t.id,
      label: t.label,
      nova_power: Number(t.novaPower),
      price_ton: Number(t.priceTon),
      daily_ton: Number(t.dailyTon ?? 0),
      month_ton: Number(t.monthTon ?? 0),
      hot: !!t.hot,
      active: true,
    }));

    if (rows.some((r: any) => !r.id || !Number.isFinite(r.nova_power) || !Number.isFinite(r.price_ton))) {
      return res.status(400).json({ error: "Invalid shop tier data" });
    }

    const { error } = await supabaseAdmin.from("shop_tiers").upsert(rows);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
