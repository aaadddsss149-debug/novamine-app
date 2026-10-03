/**
 * updateReferralStatus.ts
 *
 * Runs once per day (scheduled in index.ts).
 *
 * What it does:
 * *  1. For every pending/active referral this month, counts distinct active
 *     days from the deployed activity_feed table.
 *  2. Updates active_days_this_month on the referrals row.
 *  3. If active_days_this_month >= 10, flips status to "active".
 *  4. If a new month has started, resets active_days_this_month back to 0
 *     and flips "active" rows back to "pending" so users must re-qualify.
 */

import { supabaseAdmin } from "../lib/supabase.js";

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function updateReferralStatus() {
  const monthKey = currentMonthKey();
  console.log(`[cron] updateReferralStatus running for month=${monthKey}`);

  try {
    // 1. Fetch all referrals
    const { data: referrals, error: refErr } = await supabaseAdmin
      .from("referrals")
      .select("id, referred_id, status, active_days_this_month, month_key");

    if (refErr) throw refErr;
    if (!referrals || referrals.length === 0) {
      console.log("[cron] No referrals found, skipping.");
      return;
    }

    // 2. Count active days from mining_sessions.
    // The production schema uses mining_sessions for user activity; there is no
    // activity_feed table in the deployed schema. Querying a missing table can
    // make PostgREST return "Invalid path specified in request URL".
    const referredIds = referrals.map((r: any) => r.referred_id);
    const monthStart = new Date(Date.UTC(
      Number(monthKey.slice(0, 4)),
      Number(monthKey.slice(5, 7)) - 1,
      1
    ));
    const nextMonthStart = new Date(Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth() + 1,
      1
    ));

    const { data: activities, error: activityErr } = await supabaseAdmin
      .from("mining_sessions")
      .select("user_id, started_at")
      .in("user_id", referredIds)
      .gte("started_at", monthStart.toISOString())
      .lt("started_at", nextMonthStart.toISOString());

    if (activityErr) throw activityErr;

    // Count distinct UTC calendar days per referred user.
    const activeDaySets: Record<string, Set<string>> = {};
    for (const activity of activities ?? []) {
      if (!activity.user_id || !activity.started_at) continue;
      const day = new Date(activity.started_at).toISOString().slice(0, 10);
      (activeDaySets[activity.user_id] ??= new Set()).add(day);
    }

    const claimCount: Record<string, number> = {};
    for (const userId of referredIds) {
      claimCount[userId] = activeDaySets[userId]?.size ?? 0;
    }

    // 3. Update each referral row
    let updated = 0;
    for (const ref of referrals) {
      const activeDays = claimCount[ref.referred_id] ?? 0;
      const newStatus  = activeDays >= 10 ? "active" : "pending";

      // Reset active_days if we're in a new month
      const isNewMonth = ref.month_key && ref.month_key !== monthKey;

      const updates: any = {
        active_days_this_month: isNewMonth ? activeDays : activeDays,
        status: isNewMonth ? (activeDays >= 10 ? "active" : "pending") : newStatus,
        month_key: monthKey,
      };

      // Only write if something changed
      const changed =
        ref.active_days_this_month !== activeDays ||
        ref.status !== updates.status ||
        ref.month_key !== monthKey;

      if (changed) {
        const { error: updateErr } = await supabaseAdmin
          .from("referrals")
          .update(updates)
          .eq("id", ref.id);

        if (updateErr) {
          console.error(`[cron] Failed to update referral ${ref.id}:`, updateErr.message);
        } else {
          updated++;
        }
      }
    }

    console.log(`[cron] updateReferralStatus done — ${updated}/${referrals.length} rows updated`);
  } catch (err: any) {
    console.error("[cron] updateReferralStatus error:", err.message);
  }
}
