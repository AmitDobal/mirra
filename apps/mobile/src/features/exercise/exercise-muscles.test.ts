import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import raw from "../../content/exercise-catalog.json" with { type: "json" };
import type { ExerciseMuscle } from "../../lib/api/exercise-library.ts";
import type { CurrentPlan } from "../../lib/api/types.ts";
import {
  cleanMuscles,
  findPlanExercise,
  legendNames,
  primaryMuscleLabel,
  resolveMuscles,
} from "./exercise-muscles.ts";

type Raw = { id: string; canonicalId: string; muscle: string; muscles: [string, number][] };
const catalog = raw as unknown as Raw[];

/** AI-plan lift outside the 20-lift catalog (audit: "Tricep Dips" showed 0% focus). */
const DIPS: ExerciseMuscle[] = [
  { id: "triceps", pct: 50, role: "primary" },
  { id: "chest", pct: 30, role: "primary" },
  { id: "front_delts", pct: 20, role: "secondary" },
];

test("plan muscles win and keep server roles", () => {
  const r = resolveMuscles({ plan: DIPS, server: null, catalog: null });
  assert.equal(r.source, "plan");
  assert.deepEqual(r.focus, [
    { id: "triceps", role: "primary" },
    { id: "chest", role: "primary" },
    { id: "front_delts", role: "secondary" },
  ]);
  assert.deepEqual(r.bars, [
    { name: "Triceps", pct: 50 },
    { name: "Chest", pct: 30 },
    { name: "Front delts", pct: 20 },
  ]);
  assert.equal(legendNames(r.focus, "primary"), "Triceps, Chest");
  assert.equal(legendNames(r.focus, "secondary"), "Front delts");
  assert.equal(primaryMuscleLabel(r.focus), "Triceps");
});

test("server muscles used when the plan row has none", () => {
  const bench: ExerciseMuscle[] = [
    { id: "front_delts", pct: 15, role: "secondary" },
    { id: "chest", pct: 60, role: "primary" },
    { id: "triceps", pct: 25, role: "secondary" },
  ];
  const r = resolveMuscles({ plan: [], server: bench, catalog: null });
  assert.equal(r.source, "server");
  assert.equal(legendNames(r.focus, "primary"), "Chest");
  assert.equal(legendNames(r.focus, "secondary"), "Triceps, Front delts");
});

test("catalog labels are only a fallback; unknown lifts hide the section", () => {
  const bench = catalog.find((e) => e.id === "barbell-bench-press")!;
  const fromCatalog = resolveMuscles({
    catalog: { muscle: bench.muscle, muscles: bench.muscles.map(([name, pct]) => ({ name, pct })) },
  });
  assert.equal(fromCatalog.source, "catalog");
  assert.ok(fromCatalog.focus.some((m) => m.id === "chest" && m.role === "primary"));

  const none = resolveMuscles({ plan: [], server: [], catalog: { muscle: "Full body", muscles: [] } });
  assert.equal(none.source, "none");
  assert.equal(none.focus.length, 0, "no fake 0% focus");
  assert.equal(none.bars.length, 0);
});

test("cleanMuscles drops unknown ids, zero pct and duplicates", () => {
  const dirty = [
    { id: "chest", pct: 40, role: "primary" },
    { id: "neck", pct: 30, role: "primary" },
    { id: "chest", pct: 55, role: "primary" },
    { id: "calves", pct: 0, role: "secondary" },
  ] as unknown as ExerciseMuscle[];
  assert.deepEqual(cleanMuscles(dirty), [{ id: "chest", pct: 55, role: "primary" }]);
  assert.deepEqual(cleanMuscles(undefined), []);
});

test("findPlanExercise matches by id, then by normalized name", () => {
  const plan = {
    id: "p",
    version: 1,
    status: "ready",
    weekStart: "2026-11-02",
    days: [
      {
        id: "d1",
        dayIndex: 0,
        date: "2026-11-02",
        kind: "lift",
        workout: {
          id: "w1",
          title: "Push",
          durationMin: 45,
          exercises: [
            { id: "e1", name: "Tricep Dips", targetSets: 3, targetReps: "10", canonicalId: "triceps_dip", muscles: DIPS },
            { id: "e2", name: "Incline DB Press", targetSets: 3, targetReps: "8", canonicalId: "incline_dumbbell_press" },
          ],
        },
      },
    ],
  } satisfies CurrentPlan;
  assert.equal(findPlanExercise(plan, "e1", "x")?.canonicalId, "triceps_dip");
  assert.equal(findPlanExercise(plan, "local-9", "incline dumbbell press")?.canonicalId, "incline_dumbbell_press");
  assert.equal(findPlanExercise(plan, "nope", "Squat"), null);
  assert.equal(findPlanExercise(null, "e1", "Tricep Dips"), null);
});

test("every catalog lift maps to an API exercise-library id", () => {
  const dir = new URL("../../../../api/src/data/exercises/", import.meta.url);
  const ids = new Set(
    ["push.ts", "pull.ts", "legs.ts", "core.ts"].flatMap((f) =>
      [...readFileSync(new URL(f, dir), "utf8").matchAll(/ex\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]),
    ),
  );
  assert.ok(ids.size > 100, "library parsed");
  for (const e of catalog) assert.ok(ids.has(e.canonicalId), `${e.id} → ${e.canonicalId}`);
  assert.equal(new Set(catalog.map((e) => e.canonicalId)).size, catalog.length, "unique ids");
});
