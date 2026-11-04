/**
 * Offline assertions: meals-per-day intent parsing + slot mapping (AMI-153), plus the
 * AMI-163 diff v2 pure parts: intent v2 regexes, slot targeting, candidate pick, tags,
 * typed diff -> legacy changes, workout item mapping.
 *   npm run test:meal-revise -w @mirra/api
 */
import type { PlannedMeal } from "@mirra/contracts";

import { heuristicPlanReviser } from "../src/adapters/heuristic-plan-reviser";
import { slotsForMealCount } from "../src/lib/meal-slots";
import { sanitizeIntent } from "../src/lib/plan-intent";
import type { PlanReviseInput } from "../src/ports/plan-reviser";
import { legacyChanges } from "../src/services/revise/legacy";
import { pickCandidate, targetMeals } from "../src/services/revise/meal-targeting";
import { mealDelta, mealSwapReason, mealSwapTags } from "../src/services/revise/tags";
import { workoutItemsFrom } from "../src/services/revise/workout-step";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const base: PlanReviseInput = {
  userId: "u", message: "", scope: "auto", equipment: [], dietTags: [], foodsAvoid: null, cuisineStyles: [],
  workoutTitle: null, exerciseNames: [], mealsPerDay: null, meals: [],
  nutrition: { goal: null, kcalTarget: null, proteinGTarget: null, lifestyleNotes: null },
};
const intentOf = async (message: string) => (await heuristicPlanReviser.propose({ ...base, message })).intent;
const parse = async (message: string) => (await intentOf(message)).mealsPerDay;

const cases: [string, number | undefined][] = [
  ["I only eat two times a day", 2],
  ["I eat 2 meals a day", 2],
  ["just 3 meals a day please", 3],
  ["i eat twice a day", 2],
  ["eat once a day", 1],
  ["4 meals/day", 4],
  ["cut me down to 3 meals", 3],
  ["I train twice a day", undefined],
  ["no dairy", undefined],
  ["shorter session 30 min", undefined],
];

const meal = (id: string, slot: PlannedMeal["slot"], title: string, foods: string[], status: PlannedMeal["status"] = "planned"): PlannedMeal => ({
  id, slot, title, status, loggedMealId: null, fit: "ok", kcal: 500, proteinG: 30, carbsG: 50, fatG: 15,
  items: foods.map((foodId) => ({ foodId, name: foodId, grams: 100, unitLabel: "g", unitQty: 1, kcal: 100, proteinG: 10, carbsG: 10, fatG: 3 })),
});
const day = [
  meal("b", "breakfast", "Oats with berries", ["oats_dry"]),
  meal("l", "lunch", "Chicken & rice", ["chicken_breast_cooked", "white_rice_cooked"]),
  meal("s", "snack", "Greek yogurt", ["greek_yogurt"], "logged"),
  meal("d", "dinner", "Chicken stir fry", ["chicken_breast_cooked"]),
];

const intentV2 = async () => {
  const swap = await intentOf("swap my lunch for something with more protein");
  check(swap.mealSlots.join() === "lunch", "swap my lunch -> mealSlots [lunch]");
  check(swap.mealBias === "high_protein", "more protein -> mealBias high_protein");
  check(!swap.forceMealRegen && swap.exerciseSwaps.length === 0, "slot swap is not a whole-day regen or exercise swap");
  check(swap.dietTagsAdd.length === 0, "more protein is not saved as a diet tag");
  const avoid = await intentOf("avoid chicken");
  check(avoid.foodsAvoidAdd.join() === "chicken" && avoid.mealSlots.length === 0, "avoid chicken -> foodsAvoidAdd [chicken]");
  check((await intentOf("I don't eat chicken")).foodsAvoidAdd.includes("chicken"), "I don't eat chicken -> avoid chicken");
  check((await intentOf("change my dinner")).mealSlots.join() === "dinner", "change my dinner -> [dinner]");
  const ex = await intentOf("replace squats with lunges");
  check(ex.exerciseSwaps[0]?.from === "squats" && ex.exerciseSwaps[0]?.to === "lunges", "replace squats with lunges -> exerciseSwaps");
  const mv = await intentOf("move tuesday's workout to thursday");
  check(mv.scheduleMoves[0]?.from === "tuesday" && mv.scheduleMoves[0]?.to === "thursday", "move tuesday's workout to thursday");
  check((await intentOf("add face pulls")).exerciseAdds[0]?.name === "face pulls", "add face pulls -> exerciseAdds");
  check((await intentOf("drop dairy")).exerciseRemoves.length === 0, "drop dairy is a food, not an exercise remove");
  const clean = sanitizeIntent({ mealSlots: ["lunch", "brunch" as never], shortenMin: 500, reasons: { Lunch: "More protein — same kcal" }, preferBench: true });
  check(clean.mealSlots.join() === "lunch" && clean.shortenMin === 90, "sanitizeIntent clamps slots and minutes");
  check(clean.reasons.lunch === "More protein. Same kcal", "sanitizeIntent sanitizes reasons (no em dash)");
  check(clean.preferExercises.join() === "Bench press" && clean.preferBench === true, "preferBench <-> preferExercises stay in sync");
  check(JSON.stringify(sanitizeIntent(clean)) === JSON.stringify(clean), "sanitizeIntent is idempotent (legacy echo key)");
};

const targeting = () => {
  const lunch = targetMeals({ meals: day, mealSlots: ["lunch"], wholeDay: false, banned: null });
  check(lunch.targets.map((m) => m.slot).join() === "lunch" && !lunch.wholeDay, "swap lunch targets lunch only");
  const byId = targetMeals({ meals: day, mealItemId: "d", mealSlots: ["lunch"], wholeDay: true, banned: null });
  check(byId.targets.map((m) => m.id).join() === "d" && !byId.wholeDay, "context.mealItemId wins over slots and whole-day");
  const banned = targetMeals({ meals: day, mealSlots: [], wholeDay: false, banned: new Set(["chicken_breast_cooked"]) });
  check(banned.targets.map((m) => m.slot).join() === "lunch,dinner", "avoid chicken targets only slots with chicken");
  const logged = targetMeals({ meals: day, mealSlots: ["snack"], wholeDay: false, banned: null });
  check(logged.targets.length === 0 && /already logged/.test(logged.warnings[0] ?? ""), "logged slot is never swapped (warning)");
  check(targetMeals({ meals: day, mealSlots: [], wholeDay: true, banned: null }).wholeDay, "whole-day ask -> wholeDay");
};

const picking = () => {
  const c = (title: string, proteinG: number, carbsG = 40, kcal = 500) => ({ title, meal: { totals: { kcal, proteinG, carbsG, fatG: 10 } } });
  const list = [c("Chicken & rice", 60), c("Tofu bowl", 25), c("Salmon plate", 45), c("Turkey wrap", 40)];
  check(pickCandidate(list, "high_protein", "Chicken & rice", new Set())?.title === "Salmon plate", "high_protein picks the most protein fresh dish");
  check(pickCandidate(list, undefined, "Chicken & rice", new Set())?.title === "Tofu bowl", "no bias keeps generator order");
  check(pickCandidate(list, "low_carb", "x", new Set(["Chicken & rice"]))?.title === "Tofu bowl", "used titles are skipped");
  check(pickCandidate([c("Same", 30)], undefined, "Same", new Set()) === null, "never 'swaps' to the same dish");
};

const tagsAndLegacy = () => {
  const before = { name: "Chicken & rice", kcal: 600, proteinG: 40, carbsG: 70, fatG: 12 };
  const after = { name: "Salmon plate", kcal: 590, proteinG: 52, carbsG: 35, fatG: 20 };
  const d = mealDelta(before, after);
  check(d.kcal === -10 && d.proteinG === 12 && d.carbsG === -35, "delta = after - before");
  check(mealSwapTags(d, 600).join() === "Target intact,High protein", "tags: Target intact + High protein");
  check(mealSwapTags({ ...d, kcal: 120, proteinG: 0 }, 600).join() === "+120 kcal", "tags: +120 kcal outside 5%");
  check(mealSwapReason(d, after) === "−35g carbs · +12g protein · 590 kcal", "reason: biggest macro moves then kcal");
  const changes = legacyChanges([
    { id: "pref:avoid", kind: "pref", op: "avoid", label: "Avoid", items: ["chicken"], tags: [], reason: null },
    { id: "meal:lunch", kind: "meal_swap", slot: "lunch", before, after, delta: d, tags: [], reason: null },
  ]);
  check(changes[0]?.summary === "Avoid: chicken" && changes[0]?.before == null, "pref row has explicit label, no 'Before: nothing'");
  check(changes[1]?.after === "Lunch · Salmon plate · 590 kcal" && changes[1]?.area === "meal", "legacy meal row carries the real dish");
};

const workoutMapping = () => {
  const workout = {
    id: "w", durationMin: 60, focus: "Chest",
    exercises: ["Cable fly", "Push-up", "Dips", "Plank"].map((name, i) => ({ id: `e${i}`, name, cue: null, targetSets: 3, targetReps: "10-12", restSec: 60, sortOrder: i, swapGroup: null })),
  };
  const items = workoutItemsFrom(workout, "Thu · Push day", [
    { kind: "workout_swap", summary: "", before: "Cable fly", after: "Dumbbell fly" },
    { kind: "workout_shorten", summary: "", before: "Session 60 min", after: "Session 30 min" },
  ], sanitizeIntent({ shortenMin: 30 }));
  const swap = items[0];
  check(swap?.kind === "exercise_swap" && swap.after.name === "Dumbbell fly" && swap.after.sets === 3 && swap.after.reps === "10-12", "exercise_swap carries sets x reps");
  check(swap?.kind === "exercise_swap" && swap.tags[0] === "Dumbbells" && swap.dayLabel === "Thu · Push day", "exercise tag = after gear, dayLabel set");
  const sess = items[1];
  check(sess?.kind === "session_minutes" && sess.after === 30 && sess.droppedExercises.join() === "Dips,Plank", "session_minutes lists dropped moves");
};

const main = async () => {
  for (const [msg, want] of cases) check((await parse(msg)) === want, `"${msg}" -> ${want ?? "none"}`);
  check(slotsForMealCount(2).join() === "lunch,dinner", "2 meals = lunch,dinner");
  check(slotsForMealCount(3).join() === "breakfast,lunch,dinner", "3 meals = breakfast,lunch,dinner");
  check(slotsForMealCount(null).length === 4 && slotsForMealCount(9).length === 4, "default/clamped = 4 slots");
  check(slotsForMealCount(1).join() === "dinner", "1 meal = dinner");
  await intentV2();
  targeting();
  picking();
  tagsAndLegacy();
  workoutMapping();
  process.exit(failures === 0 ? 0 : 1);
};
void main();
