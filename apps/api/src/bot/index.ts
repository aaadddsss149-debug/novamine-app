import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { Express } from "express";
import { config } from "../config.js";
import { supabaseAdmin } from "../lib/supabase.js";


async function syncTelegramUser(from: any, referrerTelegramId?: number | null) {
  if (!from?.id) return;
  const telegramId = Number(from.id);
  const patch = { telegram_id: telegramId, username: from.username ?? null, first_name: from.first_name ?? null, last_name: from.last_name ?? null, language_code: from.language_code ?? null, last_seen_at: new Date().toISOString() };
  const { data: existing, error: readError } = await supabaseAdmin.from("users").select("id").eq("telegram_id", telegramId).maybeSingle();
  if (readError) throw readError;
  if (existing?.id) {
    const { error } = await supabaseAdmin.from("users").update(patch).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }
  let referrerId: string | null = null;
  if (referrerTelegramId && referrerTelegramId !== telegramId) {
    const { data: referrer } = await supabaseAdmin.from("users").select("id").eq("telegram_id", referrerTelegramId).maybeSingle();
    referrerId = referrer?.id ?? null;
  }
  const { data: created, error } = await supabaseAdmin.from("users").insert({ ...patch, referrer_id: referrerId }).select("id").single();
  if (error) throw error;
  return created.id;
}

function botUsername() {
  return config.bot.username.replace(/^@/, "").trim();
}

function miniAppLink(startParam?: string | null) {
  const u = botUsername();
  if (!u) return config.bot.publicUrl.replace(/\/$/, "");
  return `https://t.me/${u}${startParam ? `?startapp=${encodeURIComponent(startParam)}` : ""}`;
}

function appKeyboard(referrerTelegramId?: number | null) {
  const username = botUsername();
  const inviteUrl = username && referrerTelegramId
    ? `https://t.me/share/url?url=${encodeURIComponent(
        `https://t.me/${username}?startapp=ref_${referrerTelegramId}`
      )}&text=${encodeURIComponent("🚀 Join me on EarnX and start earning rewards!")}`
    : null;

  const keyboard = new InlineKeyboard()
    .webApp("🚀 Open NovaMine", config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, ""));

  if (inviteUrl) {
    keyboard.row().url("👥 Invite Friends", inviteUrl);
  }

  return keyboard;
}

export async function startBot(app: Express) {
  if (!config.bot.token) {
    console.warn("[bot] BOT_TOKEN not set — bot disabled");
    return;
  }

  const bot = new Bot(config.bot.token);
  const username = botUsername();

  bot.catch((err) => {
    console.error("[bot] update error:", err.error);
  });

  // ── /start ───────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const startParam = ctx.match?.toString().trim() || null;
    const firstName = ctx.from?.first_name || "Miner";

    // NovaMine welcome message: clean Telegram layout with a prominent
    // Mini App button and an optional referral button, matching the
    // reference design shown by the owner.
    await syncTelegramUser(ctx.from, null);

    const referralLine = startParam?.startsWith("ref_")
      ? "🎁 Referral link detected — your friend can receive rewards after joining."
      : "";

    await ctx.reply(
      [
        `🚀 *Welcome to NovaMine, ${firstName}!*`,
        "",
        "🎁 Complete tasks, watch rewarded ads, invite friends and earn rewards.",
        referralLine,
        "",
        "👇 Tap *Open NovaMine* below to start earning.",
      ].filter(Boolean).join("\n"),
      {
        parse_mode: "Markdown",
        reply_markup: appKeyboard(ctx.from?.id),
      }
    );
  });

  // ── /app ─────────────────────────────────────────────────────────────────
  bot.command("app", async (ctx) => {
    await ctx.reply("⚡ Your EarnX dashboard is ready:", {
      reply_markup: appKeyboard(ctx.from?.id),
    });
  });

  // ── /balance ─────────────────────────────────────────────────────────────
  bot.command("balance", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("nova, ton_balance, mining_power, first_name")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (error) {
      console.error("[bot] balance lookup failed:", error.message);
      return ctx.reply("⚠️ I couldn't load your balance right now. Please try again.");
    }

    if (!user) {
      return ctx.reply(
        "👋 You haven't opened EarnX yet. Tap the button below to create your account.",
        { reply_markup: appKeyboard(ctx.from?.id) }
      );
    }

    await ctx.reply(
      [
        `⚡ *EarnX Balance — ${user.first_name || "Miner"}*`,
        "",
        `💎 TON: *${Number(user.ton_balance || 0).toFixed(6)}*`,
        `💎 TON: *${Number(user.ton_balance || 0).toFixed(6)}*`,
        `⚡ Power: *${Number(user.mining_power || 0).toLocaleString()}*`,
        "",
        "Open EarnX to earn more.",
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: appKeyboard(ctx.from?.id) }
    );
  });

  // ── /invite ──────────────────────────────────────────────────────────────
  bot.command("invite", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !username) {
      return ctx.reply("⚠️ Referral links are not configured yet.");
    }

    const link = `https://t.me/${username}?startapp=ref_${telegramId}`;

    await ctx.reply(
      [
        "👥 *Your EarnX referral link*",
        "",
        "Share this link with friends:",
        `\`${link}\``,
        "",
        "Friends who join through your link are tracked automatically.",
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: new InlineKeyboard().url("🚀 Open EarnX", link) }
    );
  });

  // ── /help ────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "⚡ *EarnX Help*",
        "",
        "/start — welcome & open EarnX",
        "/app — open the Mini App",
        "/balance — view your balance",
        "/invite — get your referral link",
        "/help — show this menu",
        "",
        "Inside EarnX you can use Tasks, Reward Ads, Referrals and Withdraw.",
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: appKeyboard(ctx.from?.id) }
    );
  });

  // Ignore commands we don't own and give plain messages a useful response.
  bot.on("message:text", async (ctx) => {
    await ctx.reply("⚡ Use the buttons below to open EarnX.", {
      reply_markup: appKeyboard(),
    });
  });

  // ── Bot UX setup ─────────────────────────────────────────────────────────
  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Open EarnX" },
      { command: "app", description: "Launch the Mini App" },
      { command: "balance", description: "Check TON & TON" },
      { command: "invite", description: "Get your referral link" },
      { command: "help", description: "EarnX help" },
    ]);

    if (username) {
      const appUrl = config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, "");
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "🚀 Open NovaMine",
          web_app: { url: appUrl },
        },
      });
    }
  } catch (err) {
    console.error("[bot] Telegram UI setup failed:", err);
  }

  // ── Notification scheduler ───────────────────────────────────────────────
  // Disabled until the production users table contains the notification
  // timestamp columns. Running the old joined query against the deployed
  // schema causes PostgREST "Invalid path specified in request URL" errors.
  // Re-enable this block only after applying the notification schema migration.
  console.log("[bot] notifications disabled until notification schema is deployed");

  // ── Telegram transport ───────────────────────────────────────────────────
  // Use Telegram webhooks in production to avoid 409 getUpdates conflicts.
  try {
    if (!config.bot.publicUrl) throw new Error("PUBLIC_API_URL is not configured");
    const webhookUrl = config.bot.publicUrl.replace(/\/$/, "") + "/webhook";

    app.post("/webhook", async (req, res) => {
      try {
        if (config.bot.webhookSecret) {
          const received = String(req.header("x-telegram-bot-api-secret-token") || "");
          if (received !== config.bot.webhookSecret) return res.sendStatus(403);
        }
        const handler = webhookCallback(bot, "express");
        await handler(req, res);
      } catch (err) {
        console.error("[bot] webhook handler failed:", err);
        if (!res.headersSent) res.sendStatus(500);
      }
    });

    await bot.api.setWebhook(webhookUrl, {
      drop_pending_updates: false,
      ...(config.bot.webhookSecret ? { secret_token: config.bot.webhookSecret } : {}),
    });
    console.log("[bot] webhook set: " + webhookUrl);
  } catch (err) {
    console.error("[bot] failed to configure webhook:", err);
  }
}
