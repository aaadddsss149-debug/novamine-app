import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { Express } from "express";
import { config } from "../config.js";
import { supabaseAdmin } from "../lib/supabase.js";

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
    .webApp("🚀 Open EarnX", config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, ""));

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

    const referralLine = startParam?.startsWith("ref_")
      ? "\n🎁 Referral link detected — your friend can receive rewards after joining."
      : "";

    await ctx.reply(
      [
        `🚀 *Welcome to EarnX, ${firstName}!*`,
        "",
        "Your all-in-one Telegram rewards hub — complete missions, watch rewarded ads, invite friends and grow your EarnX balance.",
        referralLine,
        "",
        "👇 Open the Mini App and start earning.",
      ].join("\n"),
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
        `⚡ EARNX: *${Number(user.nova || 0).toLocaleString()}*`,
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
      { command: "balance", description: "Check EARNX & TON" },
      { command: "invite", description: "Get your referral link" },
      { command: "help", description: "EarnX help" },
    ]);

    if (username) {
      const appUrl = config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, "");
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "🚀 Open EarnX",
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
  if (config.isProd && config.bot.publicUrl) {
    const path = "/telegram/webhook";
    const rawSecret = config.bot.webhookSecret || "";
    const webhookSecret =
      rawSecret.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 256) || undefined;

    app.use(
      path,
      webhookCallback(bot, "express", {
        secretToken: webhookSecret,
      })
    );

    const webhookUrl = `${config.bot.publicUrl.replace(/\/$/, "")}${path}`;

    try {
      await bot.api.setWebhook(webhookUrl, {
        secret_token: webhookSecret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true,
      });
      console.log(`[bot] webhook set to ${webhookUrl}`);
    } catch (err) {
      console.error("[bot] failed to set webhook:", err);
    }
  } else {
    bot.start({
      onStart: (info) => console.log(`[bot] long-polling as @${info.username}`),
    });
  }
}
