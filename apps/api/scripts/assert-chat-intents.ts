/**
 * AMI-173 plan chat phrasing table: ~30 realistic messages (swap / add / remove exercise,
 * move a day by workout name or relative day, session minutes, meals per day, meal slots,
 * avoid / diet / cuisine, multi-intent, casual Hinglish) through the full propose pipeline
 * with the heuristic adapter (in-memory D1, all migrations). Each row asserts the item kinds
 * and the key fields the S28 card shows.
 *   npm run test:chat-intents -w @mirra/api
 */
import type { CoachReviseResponse, ReviseItem } from "@mirra/contracts";

import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { newId } from "../src/lib/id";
import { generatePlan } from "../src/services/meal-plan";
import { revisePlans } from "../src/services/plan-revise";
import { createMemoryDb } from "./lib/memory-d1";

const { db } = createMemoryDb();
const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
const addDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const today = addDays(0);
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayName = (n: number) => WEEKDAY[new Date(`${addDays(n)}T00:00:00Z`).getUTCDay()]!;

type Ex = [name: string, sets: number, reps: string];
const W: Record<string, Ex[]> = {
  "Push day": [["Bench press", 4, "6-8"], ["Overhead press", 3, "8-10"], ["Tricep Dips", 3, "8-10"], ["Cable fly", 3, "12-15"]],
  "Legs day": [["Back squat", 4, "6-8"], ["Lunges", 3, "8-10/leg"], ["Romanian deadlift", 3, "8-10"], ["Leg curl", 3, "10-12"]],
  "Pull day": [["Barbell row", 3, "8-10"], ["Lat pulldown", 3, "10-12"], ["Bicep curl", 3, "10-12"]],
  "Upper body": [["Incline dumbbell press", 3, "8-12"], ["Pull-up", 3, "6-10"], ["Lateral raise", 3, "12-15"]],
};
/** today Push, +1 rest, +2 Legs, +3 Pull, +4 rest, +5 Upper body, +6 rest. */
const LAYOUT: (string | null)[] = ["Push day", null, "Legs day", "Pull day", null, "Upper body", null];

const seedUser = async () => {
  const userId = newId();
  const planId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.preferences).values({ userId, primaryGoal: "build_muscle", experience: "months", equipmentJson: '["full_gym"]' });
  await db.insert(schema.plans).values({
    id: planId, userId, version: 1, status: "ready", weekStart: today, source: "heuristic",
    summaryJson: JSON.stringify({ kcalTarget: 2400, proteinG: 160, carbsG: 260, fatG: 75 }),
  });
  const ids: Record<string, string> = {};
  for (const [i, [title, list]] of Object.entries(W).entries()) {
    const id = newId();
    ids[title] = id;
    await db.insert(schema.workouts).values({ id, planId, title, durationMin: 45, focus: null, sortOrder: i });
    for (const [j, [name, sets, reps]] of list.entries()) {
      await db.insert(schema.workoutExercises).values({ id: newId(), workoutId: id, name, targetSets: sets, targetReps: reps, sortOrder: j });
    }
  }
  for (const [i, t] of LAYOUT.entries()) {
    await db.insert(schema.planDays).values({
      id: newId(), planId, dayIndex: i, date: addDays(i), kind: t ? "lift" : "rest", label: t ?? "Rest", workoutId: t ? ids[t]! : null,
    });
  }
  const ctx = { env, db, userId };
  await generatePlan(ctx, { date: today });
  return { ctx, ids };
};

type Of<K extends ReviseItem["kind"]> = Extract<ReviseItem, { kind: K }>;
type R = CoachReviseResponse;
const all = <K extends ReviseItem["kind"]>(r: R, k: K) => (r.items ?? []).filter((i): i is Of<K> => i.kind === k);
const kinds = (r: R) => [...new Set((r.items ?? []).map((i) => i.kind))].sort().join();
const slots = (r: R) => all(r, "meal_swap").map((s) => s.slot).join();
type Ids = Record<string, string>;

/** Schedule move of `title` from day offset `from` to `to` (to may be a list of allowed offsets). */
const moved = (r: R, title: string, from: number, to: number | number[]) =>
  all(r, "schedule_day_move").some((m) => m.title === title && m.fromDate === addDays(from) && [to].flat().map(addDays).includes(m.toDate));
const weekend = [0, 1, 2, 3, 4, 5, 6].filter((n) => ["Saturday", "Sunday"].includes(dayName(n)));
const swapTo = (r: R, before: string, canonicalId: string) =>
  all(r, "exercise_swap").length === 1 && all(r, "exercise_swap")[0]!.before.name === before && all(r, "exercise_swap")[0]!.after.canonicalId === canonicalId;
const pref = (r: R, op: string, item: RegExp) => all(r, "pref").some((p) => p.op === op && p.items.some((x) => item.test(x)));

type Case = [message: string, ok: (r: R, ids: Ids) => boolean];
const CASES: Case[] = [
  // Move a day by workout name / relative day.
  ["move legs to tomorrow", (r) => moved(r, "Legs day", 2, 1)],
  [`move leg day to ${dayName(4)}`, (r) => moved(r, "Legs day", 2, 4)],
  [`move my upper body workout to next ${dayName(6)}`, (r) => moved(r, "Upper body", 5, 6)],
  ["move pull to this weekend", (r) => all(r, "schedule_day_move").some((m) => m.title === "Pull day" && weekend.map(addDays).includes(m.toDate))],
  ["can you move today's workout to tomorrow", (r) => moved(r, "Push day", 0, 1)],
  ["do legs tomorrow instead", (r) => moved(r, "Legs day", 2, 1)],
  [`swap ${dayName(2)} and ${dayName(3)} workouts`, (r) => moved(r, "Legs day", 2, 3) && moved(r, "Pull day", 3, 2)],
  // Exercise swaps.
  ["replace bench press with dumbbell bench press", (r) => kinds(r) === "exercise_swap" && swapTo(r, "Bench press", "dumbbell_bench_press")],
  ["swap tricep dips for skull crushers", (r) => swapTo(r, "Tricep Dips", "skull_crusher")],
  ["swap out the cable fly", (r) => all(r, "exercise_swap").length === 1 && all(r, "exercise_swap")[0]!.before.name === "Cable fly"],
  ["replace cable fly with dumbbell fly", (r) => swapTo(r, "Cable fly", "dumbbell_fly")],
  // Adds / removes, on the named workout.
  ["add face pulls to my pull day", (r, ids) => all(r, "exercise_add").some((a) => a.after.canonicalId === "face_pull" && a.workoutId === ids["Pull day"])],
  ["add calf raises to leg day", (r, ids) => all(r, "exercise_add").some((a) => a.after.canonicalId === "calf_raise" && a.workoutId === ids["Legs day"])],
  ["remove lunges", (r, ids) => all(r, "exercise_remove").some((x) => x.before.name === "Lunges" && x.workoutId === ids["Legs day"])],
  ["drop the overhead press", (r) => all(r, "exercise_remove").some((x) => x.before.name === "Overhead press")],
  // Session minutes / meals per day.
  ["make my workout 30 minutes", (r) => all(r, "session_minutes").some((s) => s.after === 30)],
  ["I only have 20 mins today", (r) => all(r, "session_minutes").some((s) => s.after === 20)],
  ["I only eat 3 meals a day", (r) => all(r, "meals_per_day").some((m) => m.after === 3)],
  // Meal slots.
  ["swap my lunch", (r) => slots(r) === "lunch"],
  ["swap my breakfast and lunch", (r) => slots(r) === "breakfast,lunch"],
  ["change dinner to something high protein", (r) => slots(r) === "dinner"],
  // Food prefs.
  ["no dairy please", (r) => pref(r, "avoid", /dairy/)],
  ["I'm vegetarian now", (r) => pref(r, "diet_tag", /vegetarian/i)],
  ["prefer indian food", (r) => all(r, "pref").some((p) => p.items.some((x) => /indian/i.test(x)))],
  // Multi-intent.
  ["replace tricep dips with skull crushers and swap my lunch", (r) => swapTo(r, "Tricep Dips", "skull_crusher") && slots(r) === "lunch"],
  ["move legs to tomorrow, remove lunges", (r) => moved(r, "Legs day", 2, 1) && all(r, "exercise_remove").some((x) => x.before.name === "Lunges")],
  ["no chicken, and make dinner lighter", (r) => pref(r, "avoid", /chicken/) && slots(r).includes("dinner")],
  // Casual Hinglish.
  ["lunch change kar do high protein wala", (r) => slots(r) === "lunch"],
  ["legs ko kal shift kar do", (r) => moved(r, "Legs day", 2, 1)],
  ["bench press ki jagah dumbbell press daal do", (r) => kinds(r) === "exercise_swap" && swapTo(r, "Bench press", "dumbbell_bench_press")],
  ["dinner mein chicken nahi chahiye", (r) => pref(r, "avoid", /chicken/)],
  ["aaj ka workout chhota kar do 30 min", (r) => all(r, "session_minutes").some((s) => s.after === 30)],
];

const main = async () => {
  let pass = 0;
  for (const [message, ok] of CASES) {
    const { ctx, ids } = await seedUser();
    const r = await revisePlans(ctx, { message, scope: "auto", date: today, dryRun: true });
    const good = ok(r, ids) && Boolean(r.draftId);
    if (good) pass += 1;
    const detail = good ? "" : `  - ${JSON.stringify({ kinds: kinds(r), items: r.items?.map((i) => ({ ...i, tags: undefined, reason: undefined })), warnings: r.warnings, intent: r.intent })}`;
    console.log(`${good ? "PASS" : "FAIL"}  "${message}"${detail}`);
  }
  console.log(`\n${pass}/${CASES.length} phrasings pass`);
  process.exit(pass === CASES.length ? 0 : 1);
};
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
