// EarnX API — entry point.
// Hosts:
//   1. Express HTTP API (consumed by the Vercel-hosted Mini App)
//   2. Telegram bot (grammy) — receives updates via webhook in prod, long-poll in dev
//
// Both share the same process so Render only needs one web service.
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { miningRouter } from "./routes/mining.js";
import { swapRouter } from "./routes/swap.js";
import { withdrawRouter } from "./routes/withdraw.js";
import { shopRouter } from "./routes/shop.js";
import { referralsRouter } from "./routes/referrals.js";
import { leaderboardRouter } from "./routes/leaderboard.js";
import { adminRouter } from "./routes/admin.js";
import { tasksRouter } from "./routes/tasks.js";
import { errorHandler } from "./middleware/error.js";
import { startBot } from "./bot/index.js";
import { updateReferralStatus } from "./cron/updateReferralStatus.js";

const app = express();

// Behind Render's load balancer
app.set("trust proxy", 1);

app.use(express.json({ limit: "256kb" }));
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin / curl (no origin header)
      if (!origin) return cb(null, true);
      if (config.corsOrigins.includes(origin)) return cb(null, true);
      // Allow any Vercel preview deployment of our project
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Healthcheck (Render pings this)
app.get("/", (_req, res) => res.json({ ok: true, service: "earnx-api" }));
app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Public routes
app.use("/auth", authRouter);
app.use("/leaderboard", leaderboardRouter);

// Public ad-config endpoint (no auth — frontend reads this to know if ads are enabled)
// AdsGram Reward URL webhook.
// AdsGram replaces [userId] with the Telegram user ID and calls this endpoint
// after the rewarded ad flow. We only record the server-side confirmation here;
// the actual reward is granted by the authenticated Mini App callback, so this
// endpoint cannot be abused to mint NOVA by calling it directly.
app.get("/adsgram/reward", async (req, res) => {
  try {
    const rawUserId = String(req.query.userid ?? "").trim();
    if (!/^\d{5,20}$/.test(rawUserId)) return res.status(400).json({ ok:false, error:"invalid_userid" });
    const telegramId = Number(rawUserId);
    const { supabaseAdmin } = await import("./lib/supabase.js");
    const { data:user } = await supabaseAdmin.from("users").select("id,ton_balance").eq("telegram_id",telegramId).maybeSingle();
    if (!user) return res.status(404).json({ok:false,error:"user_not_found"});
    const { count } = await supabaseAdmin.from("adsgram_reward_events").select("id",{count:"exact",head:true})
      .eq("telegram_id",telegramId).gte("received_at",new Date(Date.now()-24*60*60*1000).toISOString());
    if ((count ?? 0) >= 20) return res.json({ok:true,credited:false,reason:"daily_limit"});
    const { data:event,error:eventError } = await supabaseAdmin.from("adsgram_reward_events").insert({telegram_id:telegramId,source:"adsgram"}).select("id").single();
    if (eventError) throw eventError;
    const rewardTon = 0.0013;
    const { data:updated,error:updateError } = await supabaseAdmin.from("users").update({ton_balance:Number(user.ton_balance||0)+rewardTon})
      .eq("id",user.id).select("ton_balance").single();
    if (updateError) throw updateError;
    return res.json({ok:true,credited:true,rewardTon,tonBalance:updated.ton_balance,events:event ? 1 : 0,dailyCount:(count??0)+1,dailyLimit:20});
  } catch (err) {
    console.error("[adsgram] reward callback failed:", err);
    return res.status(500).json({ok:false});
  }
});

app.get("/adsgram/daily-status", async (req,res)=>{
  try{
    const telegramId=Number(String(req.query.userid??"").trim());
    if(!Number.isSafeInteger(telegramId)||telegramId<=0) return res.status(400).json({ok:false,error:"invalid_userid"});
    const {supabaseAdmin}=await import("./lib/supabase.js");
    const {count}=await supabaseAdmin.from("adsgram_reward_events").select("id",{count:"exact",head:true})
      .eq("telegram_id",telegramId).gte("received_at",new Date(Date.now()-24*60*60*1000).toISOString());
    res.json({ok:true,dailyCount:count??0,dailyLimit:20,rewardTon:0.0013});
  }catch{res.status(500).json({ok:false});}
});

app.get("/ad-config-public", async (_req, res) => {
  try {
    const { supabaseAdmin } = await import("./lib/supabase.js");
    const { data } = await supabaseAdmin.from("app_config")
      .select("key,value").in("key", ["ads_enabled", "ad_triggers", "adsgram_block_id"]);
    const cfg: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
    res.json({
      adsEnabled: cfg.ads_enabled ?? false,
      adTriggers: cfg.ad_triggers ?? { start_mining: false, collect_mining: false, spin_slot: false, dice_roll: false },
      adBlockId: typeof cfg.adsgram_block_id === "string" ? cfg.adsgram_block_id : "",
    });
  } catch { res.json({ adsEnabled: false, adTriggers: {} }); }
});

// Authenticated routes
app.use("/me", meRouter);
app.use("/mining", miningRouter);
app.use("/swap", swapRouter);
app.use("/withdraw", withdrawRouter);
app.use("/shop", shopRouter);
app.use("/referrals", referralsRouter);
app.use("/tasks", tasksRouter);
app.use("/admin", adminRouter);

app.use(errorHandler);

// Boot the Telegram bot alongside the HTTP server.
// In production we use a webhook (mounted on this same Express app).
// In development we long-poll so you don't need a public URL.
startBot(app).catch((err) => {
  console.error("[bot] failed to start:", err);
});

app.listen(config.port, () => {
  console.log(`[api] listening on :${config.port} (env=${config.nodeEnv})`);
});

// ── Daily referral cron ──────────────────────────────────────────────────────
// Disabled until the deployed Supabase schema is confirmed to contain every
// referrals/mining_sessions field used by updateReferralStatus. The previous
// scheduler was the source of repeated PostgREST "Invalid path specified in
// request URL" errors. Referral API routes remain available; this only stops
// the broken background job from spamming the API logs.
console.log("[cron] referral status scheduler disabled until schema is verified");
