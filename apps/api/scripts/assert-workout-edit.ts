/**
 * AMI-172 against the real schema (all D1 migrations, in-memory SQLite):
 * - S27 swap / add: `POST|PATCH|DELETE /v1/workouts/:id/exercises` services resolve
 *   canonicalId + muscles through the AMI-161 library, persist to the plan, enforce ownership.
 * - S17 RPE: a repeat complete saves RPE without a second strength recompute; PATCH session.
 *   npm run test:workout-edit -w @mirra/api
 */
import {
  CompleteSessionBodySchema,
  CreatePlanExerciseBodySchema,
  PatchPlanExerciseBodySchema,
  PatchSessionBodySchema,
  PlanExerciseResponseSchema,
  WorkoutSessionResponseSchema,
  type TierChange,
} from "@mirra/contracts";
import { eq } from "drizzle-orm";

import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { ApiError } from "../src/lib/errors";
import { newId } from "../src/lib/id";
import { addPlanExercise, deletePlanExercise, patchPlanExercise } from "../src/services/plan-exercise-edit";
import { loadCurrentPlan } from "../src/services/plan-loaders";
import { completeSession, updateSession } from "../src/services/workout-complete";
import { createMemoryDb } from "./lib/memory-d1";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  - ${detail}`}`);
  if (!ok) failures += 1;
};
const statusOf = async (p: Promise<unknown>): Promise<number> =>
  p.then(
    () => 200,
    (err: unknown) => (err instanceof ApiError ? Number(err.status) : 500),
  );

const { db } = createMemoryDb();
const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
const today = new Date().toISOString().slice(0, 10);

const seedUser = async (status = "ready") => {
  const userId = newId();
  const planId = newId();
  const workoutId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.plans).values({
    id: planId, userId, version: 1, status, weekStart: today, source: "heuristic", summaryJson: "{}",
  });
  await db.insert(schema.workouts).values({ id: workoutId, planId, title: "Pull day", durationMin: 45, focus: "Back" });
  const ids: string[] = [];
  for (const [i, name] of ["Barbell Row", "Bench Press"].entries()) {
    const id = newId();
    ids.push(id);
    await db.insert(schema.workoutExercises).values({
      id, workoutId, name, targetSets: 4, targetReps: "8", sortOrder: i, swapGroup: "g1",
      canonicalId: i === 0 ? "barbell_row" : "bench_press",
    });
  }
  return { userId, workoutId, ids, ctx: { db, userId, env } };
};

const a = await seedUser();
const b = await seedUser();
const old = await seedUser("superseded");

// ── contracts: what the mobile client sends parses ──────────────────────────
check(CreatePlanExerciseBodySchema.safeParse({ name: "Deadlift", targetSets: 3, targetReps: 8, restSec: 120, cue: null }).success, "create body: numeric reps");
check(!PatchPlanExerciseBodySchema.safeParse({}).success, "patch body: empty refused");
check(PatchSessionBodySchema.safeParse({ rpe: 7 }).success && !PatchSessionBodySchema.safeParse({}).success, "patch session body");

// ── add (S27 "Add to session") ──────────────────────────────────────────────
const added = await addPlanExercise(a.ctx, a.workoutId, CreatePlanExerciseBodySchema.parse({
  name: "Barbell Deadlift", targetSets: 3, targetReps: "5", restSec: 180, cue: "Brace",
}));
check(PlanExerciseResponseSchema.safeParse(added).success, "add response matches PlanExercise contract");
check(added.canonicalId === "deadlift", `add resolves library canonicalId (${added.canonicalId})`);
check(added.muscles.some((m) => m.id === "hamstrings" && m.role === "primary"), "add returns muscles with a primary");
check(added.sortOrder === 2, `add appends after the last exercise (${added.sortOrder})`);
const [stored] = await db.select().from(schema.workoutExercises).where(eq(schema.workoutExercises.id, added.id));
check(stored?.canonicalId === "deadlift" && stored.restSec === 180 && stored.cue === "Brace", "add persists the row with canonicalId");

const custom = await addPlanExercise(a.ctx, a.workoutId, CreatePlanExerciseBodySchema.parse({ name: "Zercher carry", targetSets: 2, targetReps: "30s" }));
check(custom.canonicalId !== null && custom.muscles.length > 0, `unknown name resolves via tagger (${custom.canonicalId})`);

// ── swap (S27 "Swap") ───────────────────────────────────────────────────────
const swapped = await patchPlanExercise(a.ctx, a.workoutId, a.ids[1]!, PatchPlanExerciseBodySchema.parse({
  name: "Dumbbell Bench Press", targetSets: 4, targetReps: "10-12", restSec: 90, cue: "Elbows 45°",
}));
check(swapped.id === a.ids[1] && swapped.sortOrder === 1 && swapped.swapGroup === "g1", "swap keeps id, slot and swap group");
check(swapped.canonicalId === "dumbbell_bench_press", `swap re-resolves canonicalId (${swapped.canonicalId})`);
check(swapped.targetReps === "10-12" && swapped.muscles.some((m) => m.id === "chest"), "swap returns new reps + muscles");
const edited = await patchPlanExercise(a.ctx, a.workoutId, a.ids[0]!, PatchPlanExerciseBodySchema.parse({ targetSets: 5 }));
check(edited.targetSets === 5 && edited.canonicalId === "barbell_row" && edited.name === "Barbell Row", "sets-only edit keeps name + canonicalId");

const plan = await loadCurrentPlan(db, a.userId);
const names = plan.workouts[0]?.exercises.map((e) => e.name) ?? [];
check(
  names.join("|") === "Barbell Row|Dumbbell Bench Press|Barbell Deadlift|Zercher carry",
  `current plan reflects edits in order (${names.join("|")})`,
);

// ── ownership ───────────────────────────────────────────────────────────────
const body = CreatePlanExerciseBodySchema.parse({ name: "Plank", targetSets: 3, targetReps: "45s" });
check((await statusOf(addPlanExercise(b.ctx, a.workoutId, body))) === 404, "add to another user's workout → 404");
check((await statusOf(patchPlanExercise(b.ctx, a.workoutId, a.ids[0]!, { targetSets: 2 }))) === 404, "patch another user's exercise → 404");
check((await statusOf(patchPlanExercise(a.ctx, a.workoutId, b.ids[0]!, { targetSets: 2 }))) === 404, "patch an exercise from another workout → 404");
check((await statusOf(deletePlanExercise(b.ctx, a.workoutId, a.ids[0]!))) === 404, "delete another user's exercise → 404");
check((await statusOf(addPlanExercise(old.ctx, old.workoutId, body))) === 400, "add to a superseded plan → 400");
check((await statusOf(addPlanExercise(a.ctx, "missing", body))) === 404, "unknown workout → 404");

// ── delete ──────────────────────────────────────────────────────────────────
check((await deletePlanExercise(a.ctx, a.workoutId, custom.id)).ok, "delete returns ok");
check((await statusOf(deletePlanExercise(a.ctx, a.workoutId, custom.id))) === 404, "delete twice → 404");

// ── RPE after Finish (HUD completes, S17 Done saves RPE) ────────────────────
let recomputes = 0;
const promo: TierChange[] = [];
const effects = {
  recompute: async () => {
    recomputes += 1;
    return promo;
  },
};
const sessionId = newId();
await db.insert(schema.workoutSessions).values({ id: sessionId, userId: a.userId, workoutId: a.workoutId, startedAt: new Date() });
const first = await completeSession(db, a.userId, sessionId, CompleteSessionBodySchema.parse({ rpe: null }), effects);
check(first.endedAt !== null && first.rpe === null && recomputes === 1, "first complete ends the session + recomputes once");
const again = await completeSession(db, a.userId, sessionId, CompleteSessionBodySchema.parse({ rpe: 7 }), effects);
check(WorkoutSessionResponseSchema.safeParse(again).success, "repeat complete matches the session contract");
check(again.rpe === 7 && again.endedAt === first.endedAt, `repeat complete saves rpe, keeps endedAt (rpe ${again.rpe})`);
check(recomputes === 1 && again.tierChanges?.length === 0, "repeat complete: no second strength recompute, no tier changes");
const keep = await completeSession(db, a.userId, sessionId, CompleteSessionBodySchema.parse({}), effects);
check(keep.rpe === 7, "repeat complete without rpe keeps the saved rpe");
const patched = await updateSession(db, a.userId, sessionId, PatchSessionBodySchema.parse({ rpe: 9 }));
const [row] = await db.select().from(schema.workoutSessions).where(eq(schema.workoutSessions.id, sessionId));
check(patched.rpe === 9 && row?.rpe === 9 && recomputes === 1, "PATCH session stores rpe without recompute");
check((await statusOf(updateSession(db, b.userId, sessionId, { rpe: 3 }))) === 404, "PATCH another user's session → 404");
check((await statusOf(completeSession(db, b.userId, sessionId, {}, effects))) === 404, "complete another user's session → 404");

const racer = newId();
await db.insert(schema.workoutSessions).values({ id: racer, userId: a.userId, workoutId: a.workoutId, startedAt: new Date() });
await Promise.all([
  completeSession(db, a.userId, racer, {}, effects),
  completeSession(db, a.userId, racer, { rpe: 6 }, effects),
]);
check(recomputes === 2, `two racing completes recompute once (${recomputes - 1})`);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll workout edit + RPE checks passed");
