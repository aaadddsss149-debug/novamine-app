import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { TASKS } from "@earnx/shared";

export const tasksRouter = Router();

// ── GET /tasks ────────────────────────────────────────────────────────────────
// Returns all active tasks with a `done` flag for the requesting user.
// NEVER throws on DB errors — users must always see a task list.
tasksRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).auth!.sub;

    // 1. Fetch active tasks from DB (admin-managed).
    //    If the query fails for any reason, fall back to the hardcoded list
    //    so the screen is never empty.
    const { data: dbTasks } = await supabaseAdmin
      .from("tasks")
      .select("id, label, reward, action, url, active")
      .eq("active", true);

    const rawTasks =
      dbTasks && dbTasks.length > 0
        ? dbTasks.map((t: any) => ({
            id: t.id,
            label: t.label ?? "Task",
            reward: Number(t.reward ?? 0),
            action: t.action ?? "Claim",
            url: t.url ?? null,
          }))
        : TASKS.LIST.map((t) => ({
            id: t.id,
            label: t.label,
            reward: t.reward,
            action: t.action,
            url: t.url ?? null,
          }));

    // 2. Fetch which tasks this user has already completed.
    //    Do NOT throw if this fails — worst case every task shows as unclaimed,
    //    which is safe. A throw here used to silently return 500 and show
    //    "No tasks available" even though tasks existed in the DB.
    const { data: completions } = await supabaseAdmin
      .from("tasks_completed")
      .select("task_id")
      .eq("user_id", userId);

    const completedSet = new Set(
      (completions ?? []).map((c: any) => c.task_id)
    );

    res.json({
      tasks: rawTasks.map((t) => ({ ...t, done: completedSet.has(t.id) })),
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /tasks/:id/claim ─────────────────────────────────────────────────────
const Params = z.object({ id: z.string().min(1) });

tasksRouter.post("/:id/claim", requireAuth, async (req, res, next) => {
  try {
    const { id } = Params.parse(req.params);
    const userId = (req as any).auth!.sub;

    const { data, error } = await supabaseAdmin.rpc("claim_task", {
      p_user_id: userId,
      p_task_id: id,
    });

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("TASK_ALREADY_CLAIMED")) {
        return res.status(409).json({ error: "Task already claimed" });
      }
      if (msg.includes("TASK_NOT_FOUND")) {
        return res.status(404).json({ error: "Unknown task" });
      }
      if (msg.includes("USER_NOT_FOUND")) {
        return res.status(404).json({ error: "User not found" });
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return res.status(500).json({ error: "Task claim returned no result" });

    res.json({
      taskId: row.task_id,
      reward: Number(row.reward ?? 0),
      nova: Number(row.nova ?? 0),
    });
  } catch (err) {
    next(err);
  }
});
