/**
 * AMI-163 draft lifecycle against a real schema (all D1 migrations, in-memory SQLite via
 * drizzle sqlite-proxy): propose -> draft with real dishes, apply commits it byte for byte
 * with no AI call, apply twice -> 410, plan edited in between -> 409, slot targeting,
 * avoid-food rows, meals per day, legacy v1 confirm.
 *   npm run test:revise-drafts -w @mirra/api
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

import type { CoachReviseBody, CoachReviseResponse, ReviseItem } from "@mirra/contracts";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import type { AppDB } from "../src/db";
import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { ApiError } from "../src/lib/errors";
import { newId } from "../src/lib/id";
import { generatePlan, getTodayPlan } from "../src/services/meal-plan";
import { applyDraft, revisePlans } from "../src/services/plan-revise";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  - ${detail}`}`);
  if (!ok) failures += 1;
};

// --- in-memory D1 stand-in -------------------------------------------------
const sqlite = new DatabaseSync(":memory:");
const migrations = join(import.meta.dirname, "../src/db/migrations");
for (const f of readdirSync(migrations).filter((x) => x.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(join(migrations, f), "utf8").replaceAll("--> statement-breakpoint", ""));
}
const exec = (sql: string, params: unknown[], method: string) => {
  const stmt = sqlite.prepare(sql);
  const args = params as SQLInputValue[];
  if (method === "run") {
    stmt.run(...args);
    return { rows: [] as unknown[] };
  }
  stmt.setReturnArrays(true);
  if (method === "get") return { rows: (stmt.get(...args) as unknown[] | undefined) ?? [] };
  return { rows: stmt.all(...args) as unknown[] };
};
const db = drizzle(
  async (sql, params, method) => exec(sql, params, method) as { rows: never[] },
  async (queries) => {
    sqlite.exec("BEGIN");
    try {
      const out = queries.map((q) => exec(q.sql, q.params, q.method));
      sqlite.exec("COMMIT");
      return out as { rows: never[] }[];
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  },
  { schema },
) as unknown as AppDB;
const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
const today = new Date().toISOString().slice(0, 10);

// --- seed ------------------------------------------------------------------
const seedUser = async () => {
  const userId = newId();
  const planId = newId();
  const workoutId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.preferences).values({ userId, primaryGoal: "build_muscle", experience: "months", equipmentJson: '["full_gym"]' });
  await db.insert(schema.plans).values({
    id: planId, userId, version: 1, status: "ready", weekStart: today, source: "heuristic",
    summaryJson: JSON.stringify({ kcalTarget: 2400, proteinG: 160, carbsG: 260, fatG: 75 }),
  });
  await db.insert(schema.workouts).values({ id: workoutId, planId, title: "Push day", durationMin: 45, focus: "Chest" });
  await db.insert(schema.planDays).values({ id: newId(), planId, dayIndex: 0, date: today, kind: "train", label: "Push", workoutId });
  for (const [i, name] of ["Bench press", "Cable fly", "Push-up"].entries()) {
    await db.insert(schema.workoutExercises).values({ id: newId(), workoutId, name, targetSets: 3, targetReps: "8-12", sortOrder: i });
  }
  const ctx = { env, db, userId };
  await generatePlan(ctx, { date: today });
  return ctx;
};
type Ctx = Awaited<ReturnType<typeof seedUser>>;

const propose = (ctx: Ctx, message: string, extra: Partial<CoachReviseBody> = {}) =>
  revisePlans(ctx, { message, scope: "auto", date: today, dryRun: true, ...extra });
const titles = async (ctx: Ctx) => Object.fromEntries((await getTodayPlan(ctx, today))!.meals.map((m) => [m.slot, m.title]));
const errorOf = async (run: () => Promise<unknown>): Promise<ApiError | null> => {
  try {
    await run();
    return null;
  } catch (err) {
    return err instanceof ApiError ? err : null;
  }
};
const swaps = (r: CoachReviseResponse) => (r.items ?? []).filter((i): i is Extract<ReviseItem, { kind: "meal_swap" }> => i.kind === "meal_swap");

const swapLunch = async () => {
  const ctx = await seedUser();
  const before = await titles(ctx);
  const res = await propose(ctx, "swap my lunch for something with more protein");
  const rows = swaps(res);
  const lunch = rows[0];
  check(rows.length === 1 && lunch?.slot === "lunch" && res.items?.length === 1, "swap my lunch -> exactly one meal_swap (lunch)", JSON.stringify(res.items));
  check(Boolean(lunch && lunch.before.name === before.lunch && lunch.after.name !== before.lunch), "before = current lunch, after = a different dish");
  check(Boolean(lunch && !/new dish/i.test(lunch.after.name) && lunch.after.kcal > 0 && lunch.after.proteinG > 0), "after is a real dish with macros (no placeholder)");
  check(Boolean(lunch && lunch.delta.kcal === lunch.after.kcal - lunch.before.kcal && lunch.tags.length >= 1 && lunch.reason), "delta, tags and reason present");
  check(Boolean(res.draftId && res.expiresAt && !res.applied), "preview returns draftId + expiresAt, nothing applied");
  check(res.changes.length === 1 && res.changes[0]?.after?.includes(lunch?.after.name.slice(0, 20) ?? "?") === true, "legacy changes[] derived with the real name");
  check((await titles(ctx)).lunch === before.lunch, "dry run wrote nothing");

  const usage = sqlite.prepare("select count(*) n from ai_usage_events where user_id = ?").get(ctx.userId) as { n: number };
  const applied = await applyDraft(ctx, res.draftId!);
  const after = await titles(ctx);
  check(applied.applied && after.lunch === lunch?.after.name, "apply: lunch title equals preview byte for byte", `${after.lunch} vs ${lunch?.after.name}`);
  check(after.breakfast === before.breakfast && after.dinner === before.dinner && after.snack === before.snack, "other slots untouched");
  const usageAfter = sqlite.prepare("select count(*) n from ai_usage_events where user_id = ?").get(ctx.userId) as { n: number };
  check(usageAfter.n === usage.n, "apply made no AI call (no usage rows)");
  const again = await errorOf(() => applyDraft(ctx, res.draftId!));
  check(again?.status === 410 && again.code === "draft_gone", "apply twice -> 410");
};

const stalePlan = async () => {
  const ctx = await seedUser();
  const res = await propose(ctx, "change my dinner");
  const item = (await getTodayPlan(ctx, today))!.meals.find((m) => m.slot === "dinner")!;
  await db.update(schema.mealPlanItems).set({ title: "Edited elsewhere" }).where(eq(schema.mealPlanItems.id, item.id));
  const err = await errorOf(() => applyDraft(ctx, res.draftId!));
  check(err?.status === 409 && err.code === "plan_changed", "plan edited between propose and apply -> 409 plan_changed");
  check((await titles(ctx)).dinner === "Edited elsewhere", "409 wrote nothing");
  const expired = await errorOf(() => applyDraft(ctx, res.draftId!));
  check(expired?.status === 410, "stale draft cannot be retried (410)");
  const other = await seedUser();
  const foreign = await errorOf(() => applyDraft(other, res.draftId!));
  check(foreign?.status === 404, "another user's draft -> 404");
};

const avoidChicken = async () => {
  const ctx = await seedUser();
  const plan = (await getTodayPlan(ctx, today))!;
  const dinner = plan.meals.find((m) => m.slot === "dinner")!;
  const chicken = JSON.stringify([{ foodId: "chicken_breast_cooked", name: "Chicken breast", grams: 150, unitLabel: "palm", unitQty: 1, kcal: 248, proteinG: 46, carbsG: 0, fatG: 5 }]);
  for (const m of plan.meals) {
    const items = m.id === dinner.id ? chicken : JSON.stringify(m.items.filter((i) => i.foodId !== "chicken_breast_cooked"));
    await db.update(schema.mealPlanItems).set({ itemsJson: items, title: m.id === dinner.id ? "Chicken plate" : m.title }).where(eq(schema.mealPlanItems.id, m.id));
  }
  const res = await propose(ctx, "I don't eat chicken");
  const pref = res.items?.find((i) => i.kind === "pref");
  check(pref?.kind === "pref" && pref.op === "avoid" && pref.label === "Avoid" && pref.items.join() === "chicken", "pref row {op:avoid, label:Avoid, items:[chicken]}");
  check(swaps(res).map((s) => s.slot).join() === "dinner", "meal_swap only for the slot that had chicken", swaps(res).map((s) => s.slot).join());
  check(!res.changes.some((c) => c.before === "nothing"), "no 'Before: nothing' legacy row");
  await applyDraft(ctx, res.draftId!);
  const [prefs] = await db.select().from(schema.preferences).where(eq(schema.preferences.userId, ctx.userId));
  check(/chicken/.test(prefs?.foodsAvoid ?? ""), "apply saved the avoid pref");
};

const twoMeals = async () => {
  const ctx = await seedUser();
  const before = (await getTodayPlan(ctx, today))!.meals;
  const res = await propose(ctx, "I only eat two meals a day");
  const mpd = res.items?.find((i) => i.kind === "meals_per_day");
  check(mpd?.kind === "meals_per_day" && mpd.before === 4 && mpd.after === 2, "meals_per_day {before:4, after:2}");
  const removed = (res.items ?? []).filter((i) => i.kind === "meal_remove");
  const names = removed.map((i) => (i.kind === "meal_remove" ? i.before.name : ""));
  const expected = before.filter((m) => m.slot === "breakfast" || m.slot === "snack").map((m) => m.title);
  check(removed.length === 2 && names.join() === expected.join(), "meal_remove names the dropped dishes", names.join());
  await applyDraft(ctx, res.draftId!);
  const slots = (await getTodayPlan(ctx, today))!.meals.map((m) => m.slot).join();
  check(slots === "lunch,dinner", "apply leaves lunch + dinner", slots);
};

const legacyConfirm = async () => {
  const ctx = await seedUser();
  const res = await propose(ctx, "swap my breakfast");
  const preview = swaps(res)[0]?.after.name;
  const confirm = await revisePlans(ctx, { message: "swap my breakfast", scope: "auto", date: today, dryRun: false, intent: res.intent });
  check(confirm.applied && (await titles(ctx)).breakfast === preview, "v1 confirm (intent echo) applies the previewed draft");
  // generate + one meal apply = the 2/day meal cap (AMI-159 kept).
  const capped = await propose(ctx, "swap my dinner");
  const cap = await errorOf(() => applyDraft(ctx, capped.draftId!));
  check(cap?.status === 429 && /Meal limit/.test(cap.message), "3rd meal write of the day -> 429 Meal limit");
  const fresh = await seedUser();
  const direct = await revisePlans(fresh, { message: "swap my dinner", scope: "auto", date: today });
  check(direct.applied && swaps(direct)[0]?.after.name === (await titles(fresh)).dinner, "v1 direct apply (no preview) still works");
};

const main = async () => {
  await swapLunch();
  await stalePlan();
  await avoidChicken();
  await twoMeals();
  await legacyConfirm();
  process.exit(failures === 0 ? 0 : 1);
};
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
