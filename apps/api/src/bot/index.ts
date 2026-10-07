import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import type { Express } from "express";
import { config } from "../config.js";
import { supabaseAdmin } from "../lib/supabase.js";

async function syncTelegramUser(from: any, referrerTelegramId?: number | null) {
  if (!from?.id) return;
  const telegramId = Number(from.id);
  const patch = {
    telegram_id: telegramId,
    username: from.username ?? null,
    first_name: from.first_name ?? null,
    last_name: from.last_name ?? null,
    language_code: from.language_code ?? null,
    last_seen_at: new Date().toISOString(),
  };

  const { data: existing, error: readError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (readError) throw readError;

  if (existing?.id) {
    const { error } = await supabaseAdmin.from("users").update(patch).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  let referrerId: string | null = null;
  if (referrerTelegramId && referrerTelegramId !== telegramId) {
    const { data: referrer } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("telegram_id", referrerTelegramId)
      .maybeSingle();
    referrerId = referrer?.id ?? null;
  }

  const { data: created, error } = await supabaseAdmin
    .from("users")
    .insert({ ...patch, referrer_id: referrerId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

function botUsername() {
  return config.bot.username.replace(/^@/, "").trim();
}

function appKeyboard(referrerTelegramId?: number | null) {
  const username = botUsername();
  const inviteUrl = username && referrerTelegramId
    ? `https://t.me/share/url?url=${encodeURIComponent(
        `https://t.me/${username}?startapp=ref_${referrerTelegramId}`
      )}&text=${encodeURIComponent("🚀 Join me on NovaMine and start earning rewards!")}`
    : null;

  const keyboard = new InlineKeyboard().webApp(
    "🚀 Open NovaMine",
    config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, "")
  );

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

  // /start — the main NovaMine welcome experience.
  bot.command("start", async (ctx) => {
    const startParam = ctx.match?.toString().trim() || null;
    const firstName = ctx.from?.first_name || "Miner";

    let referrerTelegramId: number | null = null;
    if (startParam?.startsWith("ref_")) {
      const parsed = Number(startParam.slice(4));
      if (Number.isSafeInteger(parsed) && parsed > 0) {
        referrerTelegramId = parsed;
      }
    }

    await syncTelegramUser(ctx.from, referrerTelegramId);

    const message = [
      `🚀 *Welcome to NovaMine, ${firstName}!*`,
      "",
      "⛏️ Mine NOVA and grow your rewards.",
      "🎁 Complete tasks, watch rewarded ads, and invite friends.",
      "💎 Track your balance and manage everything directly inside NovaMine.",
      "",
      "👇 *Tap the button below to enter NovaMine.*",
    ];

    if (referrerTelegramId) {
      message.splice(5, 0, "🎉 Referral detected — welcome bonus tracking is active.");
    }

    await ctx.reply(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: appKeyboard(ctx.from?.id),
    });
  });

  bot.command("app", async (ctx) => {
    await ctx.reply("⚡ *NovaMine is ready.*\n\nTap below to open your dashboard:", {
      parse_mode: "Markdown",
      reply_markup: appKeyboard(ctx.from?.id),
    });
  });

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
        "👋 You haven't opened NovaMine yet. Tap the button below to create your account.",
        { reply_markup: appKeyboard(ctx.from?.id) }
      );
    }

    await ctx.reply(
      [
        `⚡ *NovaMine Balance — ${user.first_name || "Miner"}*`,
        "",
        `💎 NOVA: *${Number(user.nova || 0).toLocaleString()}*`,
        `💎 TON: *${Number(user.ton_balance || 0).toFixed(6)}*`,
        `⚡ Power: *${Number(user.mining_power || 0).toLocaleString()}*`,
        "",
        "Open NovaMine to earn more.",
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: appKeyboard(ctx.from?.id) }
    );
  });

  bot.command("invite", async (ctx) => {
    const telegramId = ctx.from?.id;
    if (!telegramId || !username) {
      return ctx.reply("⚠️ Referral links are not configured yet.");
    }

    const link = `https://t.me/${username}?start=ref_${telegramId}`;

    await ctx.reply(
      [
        "👥 *Your NovaMine referral link*",
        "",
        "Share this link with friends:",
        `\`${link}\``,
        "",
        "Friends who join through your link are tracked automatically.",
      ].join("\n"),
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().url("🚀 Open NovaMine", link),
      }
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      [
        "⚡ *NovaMine Help*",
        "",
        "/start — welcome & open NovaMine",
        "/app — launch the Mini App",
        "/balance — view your balance",
        "/invite — get your referral link",
        "/help — show this menu",
      ].join("\n"),
      { parse_mode: "Markdown", reply_markup: appKeyboard(ctx.from?.id) }
    );
  });

  bot.on("message:text", async (ctx) => {
    await ctx.reply("⚡ Use the button below to open NovaMine.", {
      reply_markup: appKeyboard(),
    });
  });

  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Open NovaMine" },
      { command: "app", description: "Launch the Mini App" },
      { command: "balance", description: "Check your balance" },
      { command: "invite", description: "Get your referral link" },
      { command: "help", description: "NovaMine help" },
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

  console.log("[bot] notifications disabled until notification schema is deployed");

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
