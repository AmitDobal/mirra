/**
 * AMI-170 plan chat quality, against the real schema (all D1 migrations, in-memory SQLite):
 * bias promises hold (more protein / fewer carbs / lighter, else a warning), avoid swaps
 * exactly the meals holding the food (cheese != all dairy), preview copy never says "Done",
 * multi-intent keeps every part, apply never spends the meal cap, workoutTitle = edited day,
 * previews cap at 20/day so quick prompts past 6 still preview (AMI-171).
 *   npm run test:chat-quality -w @mirra/api
 */
import type { CoachReviseResponse, ReviseItem } from "@mirra/contracts";
import { eq } from "drizzle-orm";

import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { ApiError } from "../src/lib/errors";
import { newId } from "../src/lib/id";
import { filterCatalog } from "../src/lib/meal-diet";
import { generatePlan, getTodayPlan } from "../src/services/meal-plan";
import { applyDraft, revisePlans } from "../src/services/plan-revise";
import { DAILY_PROPOSE_LIMIT } from "../src/services/revise/limits";
import { PREVIEW_REPLY } from "../src/services/revise/orchestrator";
import { createMemoryDb } from "./lib/memory-d1";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  - ${detail}`}`);
  if (!ok) failures += 1;
};

const { db, sqlite } = createMemoryDb();
const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const today = addDays(0);

type Ex = [name: string, sets: number, reps: string];
const LEGS: Ex[] = [["Back squat", 4, "6-8"], ["Lunges", 3, "8-10/leg"]];
const PUSH: Ex[] = [["Incline dumbbell press", 3, "8-12"], ["Tricep Dips", 3, "8-10"], ["Cable fly", 3, "12-15"]];

/** full_gym user: today Legs, tomorrow Push (with Tricep Dips), real generated meals. */
const seedUser = async (cuisines: string[] = []) => {
  const userId = newId();
  const planId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.preferences).values({
    userId, primaryGoal: "build_muscle", experience: "months", equipmentJson: '["full_gym"]', cuisineJson: JSON.stringify(cuisines),
  });
  await db.insert(schema.plans).values({
    id: planId, userId, version: 1, status: "ready", weekStart: today, source: "heuristic",
    summaryJson: JSON.stringify({ kcalTarget: 2400, proteinG: 160, carbsG: 260, fatG: 75 }),
  });
  const ids: Record<string, string> = {};
  for (const [i, [title, list]] of ([["Legs day", LEGS], ["Push day", PUSH]] as const).entries()) {
    const id = newId();
    ids[title] = id;
    await db.insert(schema.workouts).values({ id, planId, title, durationMin: 45, focus: null, sortOrder: i });
    for (const [j, [name, sets, reps]] of list.entries()) {
      await db.insert(schema.workoutExercises).values({ id: newId(), workoutId: id, name, targetSets: sets, targetReps: reps, sortOrder: j });
    }
  }
  for (const [i, t] of (["Legs day", "Push day", null] as const).entries()) {
    await db.insert(schema.planDays).values({
      id: newId(), planId, dayIndex: i, date: addDays(i), kind: t ? "lift" : "rest", label: t ?? "Rest", workoutId: t ? ids[t]! : null,
    });
  }
  const ctx = { env, db, userId };
  await generatePlan(ctx, { date: today });
  return ctx;
};
type Ctx = Awaited<ReturnType<typeof seedUser>>;

const propose = (ctx: Ctx, message: string) => revisePlans(ctx, { message, scope: "auto", date: today, dryRun: true });
type Of<K extends ReviseItem["kind"]> = Extract<ReviseItem, { kind: K }>;
const all = <K extends ReviseItem["kind"]>(r: CoachReviseResponse, k: K) => (r.items ?? []).filter((i): i is Of<K> => i.kind === k);
const slots = (r: CoachReviseResponse) => all(r, "meal_swap").map((s) => s.slot).join();
const dump = (r: CoachReviseResponse) => JSON.stringify({ items: r.items, warnings: r.warnings });

/** Pin today's meals to known ingredients (one food per slot keeps the check exact). */
const food = (foodId: string, name: string) => ({ foodId, name, grams: 150, unitLabel: "serving", unitQty: 1, kcal: 300, proteinG: 30, carbsG: 20, fatG: 10 });
const pinMeals = async (ctx: Ctx, bySlot: Record<string, [string, string][]>) => {
  for (const m of (await getTodayPlan(ctx, today))!.meals) {
    const items = (bySlot[m.slot] ?? [["white_rice_cooked", "White rice"]]).map(([id, n]) => food(id, n));
    await db.update(schema.mealPlanItems).set({ itemsJson: JSON.stringify(items), title: `${m.slot} ${items.map((i) => i.name).join(" + ")}` }).where(eq(schema.mealPlanItems.id, m.id));
  }
};

const bias = async () => {
  const cases = [
    ["swap my lunch for something higher protein", "proteinG", 1],
    ["swap my dinner for something lower carb", "carbsG", -1],
    ["make my lunch lighter", "kcal", -1],
  ] as const;
  for (const [msg, key, sign] of cases) {
    let kept = 0;
    let swapped = 0;
    for (let n = 0; n < 6; n++) {
      const r = await propose(await seedUser(), msg);
      for (const s of all(r, "meal_swap")) {
        swapped += 1;
        if (sign * (s.after[key] - s.before[key]) > 0) kept += 1;
      }
      if (all(r, "meal_swap").length === 0 && !(r.warnings ?? []).some((w) => /stays as is/.test(w))) kept -= 100;
    }
    check(swapped > 0 && kept === swapped, `"${msg}": every swap moves ${key} the asked way (${kept}/${swapped})`);
  }
  // Impossible ask: lunch already has more protein than any dish can -> warning, no swap.
  const ctx = await seedUser();
  const lunch = (await getTodayPlan(ctx, today))!.meals.find((m) => m.slot === "lunch")!;
  await db.update(schema.mealPlanItems).set({ proteinG: 400 }).where(eq(schema.mealPlanItems.id, lunch.id));
  const r = await propose(ctx, "swap my lunch for something higher protein");
  check(all(r, "meal_swap").length === 0 && (r.warnings ?? []).some((w) => w.includes("No higher-protein lunch")), "no higher-protein lunch exists -> warning, no less-protein swap", dump(r));
};

const avoid = async () => {
  const pins: Record<string, [string, string][]> = {
    breakfast: [["greek_yogurt_nonfat", "Greek yogurt"]],
    lunch: [["cheddar_cheese", "Cheddar cheese"], ["white_rice_cooked", "White rice"]],
    snack: [["apple", "Apple"]],
    dinner: [["chicken_breast_cooked", "Chicken breast"]],
  };
  const run = async (msg: string, cuisines: string[] = []) => {
    const ctx = await seedUser(cuisines);
    await pinMeals(ctx, pins);
    return propose(ctx, msg);
  };
  check(slots(await run("avoid chicken")) === "dinner", "avoid chicken swaps only the dinner holding chicken");
  check(slots(await run("No dairy")) === "breakfast,lunch", "no dairy swaps every meal holding dairy (yogurt + cheddar)");
  check(slots(await run("No dairy", ["indian"])) === "breakfast,lunch", "no dairy still swaps cheddar picked under other cuisines");
  check(slots(await run("dairy free")) === "breakfast,lunch", "dairy free stays broad");
  check(slots(await run("avoid cheese")) === "lunch", "avoid cheese swaps only the cheddar lunch (yogurt stays)");
  const cheese = new Set(filterCatalog([], "cheese", []).map((f) => f.id));
  check(!cheese.has("cheddar_cheese") && !cheese.has("cottage_cheese_lowfat") && cheese.has("greek_yogurt_nonfat") && cheese.has("milk_2pct"), "avoid cheese bans cheeses only, not all dairy");
  const none = await run("avoid shrimp");
  check(slots(none) === "" && all(none, "pref").length === 1 && (none.warnings ?? []).some((w) => /None of today's planned meals have shrimp/.test(w)), "avoid with no matching meal -> pref row + note, no swaps", dump(none));
  for (const s of all(await run("No dairy"), "meal_swap")) check(!/yogurt|cheese|milk|whey/i.test(s.after.name), `no dairy: new ${s.slot} has no dairy (${s.after.name})`);
};

const copyAndMulti = async () => {
  const ctx = await seedUser();
  const r = await propose(ctx, "Swap my lunch and replace tricep dips with skull crushers, no chicken");
  check(r.message === `Preview: ${PREVIEW_REPLY}` && !/\bdone\b/i.test(r.message), "preview copy is S39 conditional, never 'Done'", r.message);
  const sw = all(r, "exercise_swap")[0];
  check(all(r, "meal_swap").map((s) => s.slot).join() === "lunch", "multi-intent: lunch meal_swap kept", dump(r));
  check(sw?.before.name === "Tricep Dips" && sw.after.canonicalId === "skull_crusher", "multi-intent: tricep dips -> skull crusher kept", dump(r));
  check(all(r, "pref").some((p) => p.op === "avoid" && p.items.join() === "chicken"), "multi-intent: avoid chicken kept");
  check(r.workoutTitle === "Push day", "workoutTitle is the edited day (Push), not today (Legs)", String(r.workoutTitle));
  const applied = await applyDraft(ctx, r.draftId!);
  check(applied.applied && applied.message === "Done. Your plan is updated." && applied.workoutTitle === "Push day", "apply says Done + keeps the edited title");

  const part = await propose(await seedUser(), "swap my dinner and add more fun");
  check(slots(part) === "dinner" && (part.warnings ?? []).some((w) => w.includes('"add more fun"')), "unmappable part is named in a warning, the rest still proposed", dump(part));
  const legs = await propose(await seedUser(), "replace back squat with leg press");
  check(legs.workoutTitle === "Legs day", "workoutTitle for a today edit stays today's workout");
};

const mealCap = async () => {
  const ctx = await seedUser();
  const rows = (action: string) =>
    (sqlite.prepare("select count(*) n from audit_log where user_id = ? and action = ?").get(ctx.userId, action) as { n: number }).n;
  const dayRows = () => rows("coach.revise.meal_day");
  // Plan's own generation already wrote one meal_plan.generate row: it must not eat the chat budget.
  const slot = await propose(ctx, "swap my breakfast");
  check(slots(slot) === "breakfast" && dayRows() === 0 && rows("meal_plan.generate") === 1, "slot swap (heuristic, no AI) never counts toward the meal cap");
  check((await applyDraft(ctx, slot.draftId!)).applied && dayRows() === 0, "apply never counts toward the meal cap");
  const day1 = await propose(ctx, "new meals today");
  check(all(day1, "meal_swap").length > 0 && dayRows() === 1, "whole-day AI redraft counts 1 at propose", dump(day1));
  check((await applyDraft(ctx, day1.draftId!)).applied && dayRows() === 1, "applying the whole-day draft spends nothing more");
  const day2 = await propose(ctx, "new meals today");
  check(all(day2, "meal_swap").length > 0 && dayRows() === 2, "2nd whole-day redraft allowed (2/day), plan generation not counted");
  const capped = await propose(ctx, "new meals please and replace tricep dips with skull crushers");
  check(slots(capped) === "" && all(capped, "exercise_swap").length === 1 && (capped.warnings ?? []).some((w) => /full-day meal rebuilds/.test(w)) && dayRows() === 2,
    "3rd whole-day redraft: meals skipped with a warning, workout part kept", dump(capped));
  check((await applyDraft(ctx, capped.draftId!)).applied, "workout-only draft applies after the whole-day cap");
  const after = await propose(ctx, "swap my lunch");
  check(slots(after) === "lunch" && dayRows() === 2, "slot swaps still work after the whole-day cap");
  check((await applyDraft(ctx, after.draftId!)).applied && rows("coach.revise") === 4, "apply cap (coach.revise) still counted per apply");
};

/** AMI-171: free quick prompts kept previewing past 6; the propose cap is 20/day, apply cap untouched. */
const proposeCap = async () => {
  const ctx = await seedUser();
  let ok = 0;
  for (let n = 0; n < DAILY_PROPOSE_LIMIT; n++) {
    const r = await propose(ctx, n % 2 === 0 ? "make my workout 30 minutes" : "swap my breakfast");
    if (r.message.startsWith("Preview:")) ok += 1;
  }
  check(ok === 20, `20 previews in a day all succeed (${ok}/20, was blocked at 7 before)`);
  let status = 0;
  try {
    await propose(ctx, "swap my lunch");
  } catch (err) {
    status = err instanceof ApiError ? err.status : -1;
  }
  check(status === 429, "21st preview -> 429 rate_limited", String(status));
};

const main = async () => {
  await bias();
  await avoid();
  await copyAndMulti();
  await mealCap();
  await proposeCap();
  process.exit(failures === 0 ? 0 : 1);
};
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
