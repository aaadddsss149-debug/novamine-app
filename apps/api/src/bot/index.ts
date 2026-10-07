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


function formatCooldown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

const cooldownTimers = new Map<number, ReturnType<typeof setInterval>>();

async function getAdCooldownUntil(telegramId: number) {
  const { data: siteUser, error: userError } = await supabaseAdmin
    .from("site_users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userError || !siteUser?.id) return null;

  // The cooldown starts when the 15th ad in the rolling 24-hour window was watched.
  const { data: rewards, error: rewardError } = await supabaseAdmin
    .from("site_ad_rewards")
    .select("created_at")
    .eq("user_id", siteUser.id)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })
    .limit(15);

  if (rewardError || !rewards || rewards.length < 15) return null;

  const fifteenthRewardAt = new Date(rewards[14].created_at).getTime();
  if (!Number.isFinite(fifteenthRewardAt)) return null;

  const cooldownUntil = fifteenthRewardAt + 24 * 60 * 60 * 1000;
  if (cooldownUntil <= Date.now()) return null;

  // Keep the cached field in sync for the website as well.
  await supabaseAdmin
    .from("site_users")
    .update({ cooldown_until: new Date(cooldownUntil).toISOString() })
    .eq("id", siteUser.id);

  return cooldownUntil;
}

async function sendCooldownCountdown(ctx: any, telegramId: number) {
  const cooldownUntil = await getAdCooldownUntil(telegramId);
  if (!cooldownUntil) return;

  const textFor = () => [
    "⏳ *Ad cooldown active*",
    "",
    "🚫 You have reached today's ad limit.",
    `⏱️ *Next ads in: ${formatCooldown(cooldownUntil - Date.now())}*`,
    "",
    "The countdown updates every second.",
  ].join("\n");

  const message = await ctx.reply(textFor(), { parse_mode: "Markdown" });
  const chatId = Number(ctx.chat?.id);
  if (!chatId) return;

  const oldTimer = cooldownTimers.get(chatId);
  if (oldTimer) clearInterval(oldTimer);

  const timer = setInterval(async () => {
    try {
      const remaining = cooldownUntil - Date.now();
      if (remaining <= 0) {
        clearInterval(timer);
        cooldownTimers.delete(chatId);
        await ctx.api.editMessageText(
          chatId,
          message.message_id,
          "✅ *Ad cooldown finished.*\n\nYou can watch ads again.",
          { parse_mode: "Markdown" }
        );
        return;
      }

      await ctx.api.editMessageText(
        chatId,
        message.message_id,
        textFor(),
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      clearInterval(timer);
      cooldownTimers.delete(chatId);
      console.error("[bot] cooldown countdown stopped:", err);
    }
  }, 1000);

  cooldownTimers.set(chatId, timer);
}

function appKeyboard(referrerTelegramId?: number | null) {
  const keyboard = new InlineKeyboard().webApp(
    "🚀 Open EarnX",
    config.bot.appUrl || config.bot.publicUrl.replace(/\/api\/?$/, "")
  );
  return keyboard;
}

export async function startBot(app: Express) {
  if (!config.bot.token) {
    console.warn("[bot] BOT_TOKEN not set — bot disabled");
    return;
  }

  const bot = new Bot(config.bot.token);

  bot.catch((err) => {
    console.error("[bot] update error:", err.error);
  });

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
      `🚀 *Welcome to EarnX, ${firstName}!*`,
      "",
      "⛏️ Earn rewards and grow your balance.",
      "🎁 Complete tasks, watch rewarded ads, and invite friends.",
      "💎 Track your balance and manage everything directly inside EarnX.",
      "",
      "👇 *Tap the button below to enter EarnX.*",
    ];

    if (referrerTelegramId) {
      message.splice(5, 0, "🎉 Referral detected — welcome bonus tracking is active.");
    }

    await ctx.reply(message.join("\n"), {
      parse_mode: "Markdown",
      reply_markup: appKeyboard(),
    });

    await sendCooldownCountdown(ctx, Number(ctx.from?.id));
  });

  bot.on("message:text", async (ctx) => {
    await ctx.reply("⚡ Use the button below to open EarnX.", {
      reply_markup: appKeyboard(),
    });
    await sendCooldownCountdown(ctx, Number(ctx.from?.id));
  });

  try {
    await bot.api.setMyCommands([
      { command: "start", description: "Open EarnX" },
    ]);

    const appUrl = config.bot.appUrl || config.bot.publicUrl.replace(/\/$/, "");
    await bot.api.setChatMenuButton({
      menu_button: {
        type: "web_app",
        text: "🚀 Open EarnX",
        web_app: { url: appUrl },
      },
    });
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