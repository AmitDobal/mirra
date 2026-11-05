import assert from "node:assert/strict";
import { test } from "node:test";

import {
  affectsPlan,
  buildProfileView,
  cmToFtIn,
  formatHeight,
  formatWeight,
  ftInToCm,
  lbToKg,
  pickProfileSources,
  trainDaysLabel,
} from "./profile-format";

const PROFILE = { sex: "male", ageYears: 29, heightCm: 180.3, weightKg: 82.1, goalWeightKg: 78, pace: "steady" };
const PREFS = {
  primaryGoal: "recomp",
  experience: "y1_2",
  equipment: ["dumbbells", "barbell", "cables"],
  trainDays: [6, 1, 3, 5],
  sessionMinutes: 45,
  dietTags: ["high_protein"],
  foodsAvoid: "Shellfish, peanuts",
  cuisineStyles: ["american", "mexican", "indian"],
  units: "imperial",
  physiqueTarget: "athletic",
  lifestyleNotes: "Desk 9–6",
  mealsPerDay: 3,
};

test("height/weight follow units (stored metric)", () => {
  assert.equal(formatHeight(180.3, "imperial"), `5'11"`);
  assert.equal(formatHeight(180.3, "metric"), "180 cm");
  assert.equal(formatWeight(82.1, "imperial"), "181 lb");
  assert.equal(formatWeight(82.1, "metric"), "82.1 kg");
  assert.equal(formatWeight(null, "metric"), "Not set");
  assert.deepEqual(cmToFtIn(182.5), { ft: 6, inch: 0 });
  assert.equal(ftInToCm(5, 11), 180.3);
  assert.ok(Math.abs(lbToKg(181) - 82.1) < 0.05);
});

test("training days sorted Monday-first, deduped", () => {
  assert.equal(trainDaysLabel([6, 1, 3, 5, 3]), "Mon · Wed · Fri · Sat");
  assert.equal(trainDaysLabel([]), "Not set");
});

test("S41 rows: every section in screen order with real labels", () => {
  const v = buildProfileView(PROFILE, PREFS);
  assert.deepEqual(v.body.map((r) => `${r.title}=${r.value}`), [
    "Sex=Male", "Age=29", `Height=5'11"`, "Weight=181 lb", "Goal weight=172 lb", "Pace=Steady", "Units=Imperial",
  ]);
  assert.deepEqual(v.training.map((r) => `${r.title}=${r.value}`), [
    "Goal=Recomp", "Physique=Athletic", "Experience=1–2 years", "Training days=Mon · Wed · Fri · Sat",
    "Session length=45 min", "Equipment=Dumbbells · Barbell · Cables",
  ]);
  assert.equal(v.aboutDays, "Desk 9–6");
  assert.deepEqual(v.nutrition.map((r) => `${r.title}=${r.value}`), [
    "Diet=High protein", "Cuisines=American · Mexican · Indian", "Meals per day=3", "Foods to avoid=Shellfish, peanuts",
  ]);
});

test("female metric user + empty optionals", () => {
  const v = buildProfileView(
    { sex: "female", ageYears: 34, heightCm: 165, weightKg: 61, goalWeightKg: null, pace: null },
    { ...PREFS, units: "metric", physiqueTarget: null, lifestyleNotes: null, mealsPerDay: null, foodsAvoid: null, equipment: [] },
  );
  assert.deepEqual(v.body.slice(0, 4).map((r) => r.value), ["Female", "34", "165 cm", "61 kg"]);
  assert.equal(v.body.find((r) => r.id === "goalWeightKg")?.value, "Not set");
  assert.equal(v.training.find((r) => r.id === "physiqueTarget")?.value, "Not set");
  assert.equal(v.training.find((r) => r.id === "equipment")?.value, "None");
  assert.equal(v.nutrition.find((r) => r.id === "mealsPerDay")?.value, "4");
  assert.equal(v.nutrition.find((r) => r.id === "foodsAvoid")?.value, "None");
  assert.equal(v.aboutDays, "Add work hours, sleep, likes");
});

test("unspecified sex reads Prefer not; null profile renders placeholders", () => {
  assert.equal(buildProfileView({ sex: "unspecified", ageYears: 40 }, null).body[0]?.value, "Prefer not");
  const empty = buildProfileView(null, null);
  assert.equal(empty.units, "metric");
  assert.equal(empty.body.length, 7);
  assert.equal(empty.training.length, 6);
  assert.equal(empty.nutrition.length, 4);
});

test("rebuild prompt only for plan-affecting changes", () => {
  assert.equal(affectsPlan({ ageYears: 31 }, PREFS), false);
  assert.equal(affectsPlan({ units: "metric" }, PREFS), false);
  assert.equal(affectsPlan({ trainDays: [1, 3, 5, 6] }, PREFS), false, "same days, different order");
  assert.equal(affectsPlan({ trainDays: [1, 3, 5] }, PREFS), true);
  assert.equal(affectsPlan({ sessionMinutes: 60 }, PREFS), true);
  assert.equal(affectsPlan({ mealsPerDay: 3 }, PREFS), false);
  assert.equal(affectsPlan({ mealsPerDay: 2 }, PREFS), true);
  assert.equal(affectsPlan({ dietTags: ["vegan"] }, PREFS), true);
  assert.equal(affectsPlan({ primaryGoal: "recomp" }, PREFS), false);
  assert.equal(affectsPlan({ experience: "new" }, null), true);
});

test("pickProfileSources: server answer wins as a whole, local only before it (AMI-182 QA)", () => {
  const local = { sex: "female", ageYears: 25, preferences: { units: "metric", trainDays: [1, 3] } };
  const server = { profile: { sex: "male", ageYears: 29 }, preferences: { units: "imperial", trainDays: [1, 2, 4, 5] } };
  assert.deepEqual(pickProfileSources(server, local), { profile: server.profile, prefs: server.preferences });
  // Server has a profile but no prefs row yet: never mix in the device quiz prefs.
  assert.deepEqual(pickProfileSources({ profile: server.profile, preferences: null }, local), { profile: server.profile, prefs: null });
  // No /v1/me yet (offline first paint) or an empty account: local SQLite.
  assert.equal(pickProfileSources(null, local).prefs, local.preferences);
  assert.equal(pickProfileSources({ profile: null, preferences: null }, local).profile, local);
});
