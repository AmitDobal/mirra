/**
 * Offline assertions (no network): cuisine filtering + heuristic plan tuning.
 *   npx tsx apps/api/scripts/assert-cuisine-filter.ts     (or: pnpm/npm run test:cuisine in apps/api)
 */
import { heuristicPlanGenerator } from "../src/adapters/heuristic-plan-generator";
import { VETTED_FOODS } from "../src/data/vetted-foods";
import { filterCatalog } from "../src/lib/meal-diet";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};
const ids = (cuisines: string[], hint?: string) =>
  new Set(filterCatalog([], null, cuisines, hint).map((f) => f.id));

const total = VETTED_FOODS.length;
const other = ids(["other"]);
check(other.size < total, `other-only is NOT the whole catalog (${other.size}/${total})`);
check(!other.has("corn_tortilla") && !other.has("salmon_cooked"), "other-only drops region-specific foods");
check(other.has("tempeh") && other.has("quinoa_cooked"), "other-only keeps 'other'-tagged foods");

const indian = ids(["indian"]);
const indianOther = ids(["indian", "other"]);
check(indian.has("lentils_cooked") && !indian.has("corn_tortilla"), "indian keeps lentils, drops tortilla");
check(!indianOther.has("corn_tortilla"), "indian+other still filtered (no tortilla)");
check([...indian].every((id) => indianOther.has(id)), "indian+other ⊇ indian");

check(ids(["other"], "I love sushi and kimchi").has("salmon_cooked"), "other + sushi hint boosts japanese");
check(!ids(["other"], "I love sushi").has("corn_tortilla"), "hint does not widen to unrelated cuisines");
check(ids([]).size === total, "legacy empty list stays unfiltered");

const gen = async (prefs: object, profile: object) =>
  heuristicPlanGenerator.generate({
    userId: "u",
    timezone: "UTC",
    weekStart: "2026-11-02",
    kind: "generate",
    prefsJson: JSON.stringify({ trainDays: [1, 3, 5], sessionMinutes: 45, ...prefs }),
    profileJson: JSON.stringify(profile),
  });
const names = (r: Awaited<ReturnType<typeof gen>>) =>
  r.workouts.flatMap((w) => w.exercises.map((e) => e.name));

const bw = await gen({ equipment: ["bodyweight"], experience: "new" }, { weightKg: 70 });
check(!names(bw).some((n) => ["Squat", "Row", "Overhead press"].includes(n)), "bodyweight-only avoids loaded lifts");
const gym = await gen({ equipment: ["full_gym"], experience: "y3_plus" }, { weightKg: 70 });
check(names(gym).includes("Squat"), "full gym keeps barbell squat");
check(
  gym.workouts[0]!.exercises[0]!.targetSets > bw.workouts[0]!.exercises[0]!.targetSets,
  "experienced lifter gets more sets than beginner",
);
const old = await gen({ equipment: ["full_gym"], experience: "months" }, { weightKg: 70, ageYears: 55 });
check(old.summary.outcomeLine.includes("recovery"), "age 55 adds recovery hint");
const cui = await gen({ cuisineStyles: ["indian", "thai"] }, { weightKg: 70 });
check(cui.summary.outcomeLine.includes("Indian"), "cuisine appears in outcome line");

const m = await gen({ primaryGoal: "build_muscle" }, { weightKg: 80, sex: "male" });
const f = await gen({ primaryGoal: "build_muscle" }, { weightKg: 80, sex: "female" });
for (const sex of ["unspecified", "prefer_not", null]) {
  const u = await gen({ primaryGoal: "build_muscle" }, { weightKg: 80, sex });
  check(
    u.summary.kcalTarget > f.summary.kcalTarget && u.summary.kcalTarget < m.summary.kcalTarget,
    `sex=${sex} uses neutral mid band (${u.summary.kcalTarget})`,
  );
}

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("All assertions passed");
