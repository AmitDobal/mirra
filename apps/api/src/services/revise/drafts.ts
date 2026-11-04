import type { CoachReviseBody, ReviseItem } from "@mirra/contracts";
import { and, desc, eq, gt } from "drizzle-orm";

import { reviseDrafts } from "../../db/schema";
import { newId } from "../../lib/id";
import { parseJson } from "../../lib/json";
import type { PlanReviseIntent } from "../../ports/plan-reviser";
import type { MealPlanCtx } from "../meal-plan-draft";
import type { MealDraft } from "../meal-plan-targeted";
import type { ReviseState } from "./context";
import type { WorkoutDraft } from "./workout-step";

/** Drafts live 30 min; one pending draft per user (arch §8.2). */
export const DRAFT_TTL_MS = 30 * 60 * 1000;

/** Which plan rows a draft depends on. Apply recomputes the hash from these. */
export type DraftTouch = {
  mealDay: boolean;
  mealItemIds: string[];
  workoutId: string | null;
  prefs: boolean;
};

/** Echoed on apply so the response matches the preview without re-running the reviser. */
export type DraftMeta = {
  intent: PlanReviseIntent;
  intentKey: string;
  reply: string;
  source: "openai" | "heuristic";
  warnings: string[];
  workoutTitle: string | null;
  context: CoachReviseBody["context"] | null;
  touch: DraftTouch;
};

export type StoredDraft = {
  id: string;
  status: "pending" | "applied" | "expired";
  date: string;
  meta: DraftMeta;
  items: ReviseItem[];
  prefsPatch: Record<string, unknown> | null;
  meal: MealDraft | null;
  workout: WorkoutDraft | null;
  baseHash: string;
  expiresAt: number;
};

/** Canonical intent string (sanitizeIntent output has a fixed key order). */
export const intentKeyOf = (intent: PlanReviseIntent): string => JSON.stringify(intent);

/** FNV-1a over the touched rows: ids + names/titles + status, never free text from the user. */
export const touchHash = (s: ReviseState, t: DraftTouch): string => {
  const parts: string[] = [];
  const meals = s.mealPlan?.meals ?? [];
  if (t.mealDay) parts.push(`day:${s.mealPlan?.id ?? "none"}`, ...meals.map((m) => `${m.id}|${m.status}|${m.title}`));
  for (const id of t.mealItemIds) {
    const m = meals.find((x) => x.id === id);
    parts.push(m ? `${m.id}|${m.status}|${m.title}|${m.kcal}` : `${id}|missing`);
  }
  if (t.workoutId) {
    const w = s.plan.workouts.find((x) => x.id === t.workoutId);
    parts.push(`w:${t.workoutId}|${w?.durationMin ?? "missing"}`, ...(w?.exercises ?? []).map((e) => `${e.id}|${e.name}|${e.targetSets}|${e.targetReps}`));
  }
  if (t.prefs) parts.push(`prefs:${s.prefs?.updatedAt?.getTime() ?? 0}`);
  let h = 2166136261;
  const text = parts.join("\n");
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
};

type NewDraft = Omit<StoredDraft, "id" | "status" | "expiresAt">;

/** Expire the user's other pending drafts, then store this one. */
export const createDraft = async (ctx: MealPlanCtx, d: NewDraft): Promise<{ id: string; expiresAt: number }> => {
  const now = Date.now();
  const id = newId();
  const expiresAt = now + DRAFT_TTL_MS;
  await ctx.db.batch([
    ctx.db
      .update(reviseDrafts)
      .set({ status: "expired" })
      .where(and(eq(reviseDrafts.userId, ctx.userId), eq(reviseDrafts.status, "pending"))),
    ctx.db.insert(reviseDrafts).values({
      id,
      userId: ctx.userId,
      status: "pending",
      date: d.date,
      intentJson: JSON.stringify(d.meta),
      itemsJson: JSON.stringify(d.items),
      prefsPatchJson: d.prefsPatch ? JSON.stringify(d.prefsPatch) : null,
      mealDraftJson: d.meal ? JSON.stringify(d.meal) : null,
      workoutDraftJson: d.workout ? JSON.stringify(d.workout) : null,
      scheduleDraftJson: null,
      baseHash: d.baseHash,
      createdAt: new Date(now),
      expiresAt: new Date(expiresAt),
      appliedAt: null,
    }),
  ]);
  return { id, expiresAt };
};

const toStored = (row: typeof reviseDrafts.$inferSelect): StoredDraft => ({
  id: row.id,
  status: row.status,
  date: row.date,
  meta: parseJson<DraftMeta>(row.intentJson, {} as DraftMeta),
  items: parseJson<ReviseItem[]>(row.itemsJson, []),
  prefsPatch: row.prefsPatchJson ? parseJson<Record<string, unknown>>(row.prefsPatchJson, {}) : null,
  meal: row.mealDraftJson ? parseJson<MealDraft | null>(row.mealDraftJson, null) : null,
  workout: row.workoutDraftJson ? parseJson<WorkoutDraft | null>(row.workoutDraftJson, null) : null,
  baseHash: row.baseHash,
  expiresAt: row.expiresAt.getTime(),
});

export const loadDraft = async (ctx: MealPlanCtx, id: string): Promise<StoredDraft | null> => {
  const [row] = await ctx.db
    .select()
    .from(reviseDrafts)
    .where(and(eq(reviseDrafts.id, id), eq(reviseDrafts.userId, ctx.userId)))
    .limit(1);
  return row ? toStored(row) : null;
};

/** Legacy confirm (v1 client echoes `intent`): the live pending draft it previewed, if any. */
export const findPendingForIntent = async (
  ctx: MealPlanCtx,
  date: string,
  intentKey: string,
): Promise<StoredDraft | null> => {
  const [row] = await ctx.db
    .select()
    .from(reviseDrafts)
    .where(
      and(
        eq(reviseDrafts.userId, ctx.userId),
        eq(reviseDrafts.status, "pending"),
        eq(reviseDrafts.date, date),
        gt(reviseDrafts.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(reviseDrafts.createdAt))
    .limit(1);
  const draft = row ? toStored(row) : null;
  return draft && draft.meta.intentKey === intentKey ? draft : null;
};

/** Atomically move pending -> applied. False when another request got there first or it expired. */
export const claimDraft = async (ctx: MealPlanCtx, id: string): Promise<boolean> => {
  const now = new Date();
  const rows = await ctx.db
    .update(reviseDrafts)
    .set({ status: "applied", appliedAt: now })
    .where(
      and(
        eq(reviseDrafts.id, id),
        eq(reviseDrafts.userId, ctx.userId),
        eq(reviseDrafts.status, "pending"),
        gt(reviseDrafts.expiresAt, now),
      ),
    )
    .returning({ id: reviseDrafts.id });
  return rows.length > 0;
};

export const setDraftStatus = (ctx: MealPlanCtx, id: string, status: "pending" | "expired") =>
  ctx.db
    .update(reviseDrafts)
    .set({ status, appliedAt: null })
    .where(and(eq(reviseDrafts.id, id), eq(reviseDrafts.userId, ctx.userId)));
