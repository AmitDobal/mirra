import type { CurrentPlanResponse, ReviseItem } from "@mirra/contracts";
import { and, eq, gte, lt } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { AppDB } from "../../db";
import { planDays, workoutSessions } from "../../db/schema";
import { ApiError } from "../../lib/errors";
import type { PlanReviseIntent } from "../../ports/plan-reviser";
import { weekdayOf, type ReviseState } from "./context";
import { dateForRef } from "./weekday";

/**
 * "Move Tuesday's workout to Thursday" (arch §8.5, AMI-166): swap the two `plan_days` rows'
 * workout / kind / label in the current plan. Today or later only, never a day with a logged
 * session. Writes `schedule_draft_json`; apply re-checks sessions, then one batch.
 */

type Day = CurrentPlanResponse["days"][number];
type DaySlot = Pick<Day, "id" | "date" | "kind" | "label" | "workoutId">;

/** Stored in `revise_drafts.schedule_draft_json`: final kind/label/workout per touched day. */
export type ScheduleDraft = { planId: string; days: DaySlot[] };

export type ScheduleStepResult = {
  items: ReviseItem[];
  warnings: string[];
  draft: ScheduleDraft | null;
  dayIds: string[];
};

type Session = { startedAt: Date };
type ScheduleCtx = { db: AppDB; userId: string };

const DAY_MS = 86_400_000;
const startOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);

/** Dates (UTC) between first and last that have a logged workout session. */
const loggedDates = async (ctx: ScheduleCtx, first: string, last: string): Promise<Set<string>> => {
  const rows: Session[] = await ctx.db
    .select({ startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, ctx.userId),
        gte(workoutSessions.startedAt, new Date(startOf(first))),
        lt(workoutSessions.startedAt, new Date(startOf(last) + DAY_MS)),
      ),
    );
  return new Set(rows.map((r) => r.startedAt.toISOString().slice(0, 10)));
};

const label = (d: { date: string }): string => weekdayOf(d.date);

/** Pure planner over the plan's days (sessions already looked up). */
export const planScheduleMoves = (
  state: Pick<ReviseState, "date" | "plan">,
  moves: PlanReviseIntent["scheduleMoves"],
  logged: ReadonlySet<string>,
): ScheduleStepResult => {
  const items: ReviseItem[] = [];
  const warnings: string[] = [];
  const days: DaySlot[] = state.plan.days.map((d) => ({ id: d.id, date: d.date, kind: d.kind, label: d.label, workoutId: d.workoutId }));
  const dates = days.map((d) => d.date);
  const touched = new Set<string>();
  const titleOf = (id: string | null) => state.plan.workouts.find((w) => w.id === id)?.title ?? "Workout";

  for (const mv of moves) {
    const fromDate = dateForRef(mv.from, state.date, dates);
    const toDate = dateForRef(mv.to, state.date, dates);
    const a = days.find((d) => d.date === fromDate);
    const b = days.find((d) => d.date === toDate);
    if (!a || !b) {
      warnings.push(`${!a ? mv.from : mv.to} isn't in this week's plan`);
      continue;
    }
    if (a.id === b.id) continue;
    const past = [a, b].find((d) => d.date < state.date);
    if (past) {
      warnings.push(`Can't move ${label(past)}: that day has passed`);
      continue;
    }
    if (!a.workoutId) {
      warnings.push(`No workout on ${label(a)} to move`);
      continue;
    }
    const done = [a, b].find((d) => logged.has(d.date));
    if (done) {
      warnings.push(`You already logged a session on ${label(done)}, so it stays`);
      continue;
    }
    const moved = { kind: a.kind, label: a.label, workoutId: a.workoutId };
    const displaced = { kind: b.kind, label: b.label, workoutId: b.workoutId };
    Object.assign(a, displaced);
    Object.assign(b, moved);
    touched.add(a.id).add(b.id);
    items.push({
      id: `schedule:${items.length}`,
      kind: "schedule_day_move",
      workoutId: moved.workoutId!,
      title: titleOf(moved.workoutId),
      fromDate: a.date,
      toDate: b.date,
      fromLabel: label(a),
      toLabel: label(b),
      tags: [],
      reason: displaced.workoutId ? null : `${label(a)} becomes a rest day`,
    });
    if (displaced.workoutId) {
      items.push({
        id: `schedule:${items.length}`,
        kind: "schedule_day_move",
        workoutId: displaced.workoutId,
        title: titleOf(displaced.workoutId),
        fromDate: b.date,
        toDate: a.date,
        fromLabel: label(b),
        toLabel: label(a),
        tags: [],
        reason: "Swapped to keep both sessions",
      });
    }
  }
  const dayIds = [...touched];
  const planId = state.plan.plan?.id;
  const draft = planId && dayIds.length > 0 ? { planId, days: days.filter((d) => touched.has(d.id)) } : null;
  return { items, warnings, draft, dayIds };
};

/** Schedule side of a proposal (dry run). */
export const scheduleStep = async (
  ctx: ScheduleCtx,
  state: ReviseState,
  intent: PlanReviseIntent,
): Promise<ScheduleStepResult> => {
  if (intent.scheduleMoves.length === 0) return { items: [], warnings: [], draft: null, dayIds: [] };
  const dates = state.plan.days.map((d) => d.date).sort();
  if (dates.length === 0) return { items: [], warnings: ["No plan days to move yet"], draft: null, dayIds: [] };
  const logged = await loggedDates(ctx, dates[0]!, dates.at(-1)!);
  return planScheduleMoves(state, intent.scheduleMoves, logged);
};

/** Apply guard: a session logged on a touched day since the preview -> 409. */
export const assertScheduleFree = async (ctx: ScheduleCtx, d: ScheduleDraft): Promise<void> => {
  const dates = d.days.map((x) => x.date).sort();
  if (dates.length === 0) return;
  const logged = await loggedDates(ctx, dates[0]!, dates.at(-1)!);
  if (dates.some((x) => logged.has(x))) throw new ApiError("plan_changed", "Your plan changed. Send that again?", 409);
};

export const commitScheduleDraft = (db: AppDB, d: ScheduleDraft): BatchItem<"sqlite">[] =>
  d.days.map((x) =>
    db
      .update(planDays)
      .set({ kind: x.kind, label: x.label, workoutId: x.workoutId })
      .where(and(eq(planDays.id, x.id), eq(planDays.planId, d.planId))),
  );
