/**
 * AMI-181 plan-chat `goalImpact` (arch §6): deterministic lines for on track / later /
 * earlier / over target / stall / no target, plus contract back-compat. Offline.
 *   npm run test:goal-impact -w @mirra/api
 */
import { CoachReviseResponseSchema, findBannedGoalWords, type GoalImpact, type ReviseItem } from "@mirra/contracts";

import { computeGoalImpact, goalImpactFor } from "../src/services/revise/goal-impact";
import type { ReviseState } from "../src/services/revise/context";
import { fixtureGoalContext, noTargetGoal, withStatus } from "./lib/goal-context-fixture";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
};
const show = (i: GoalImpact | null) => (i ? `${i.line} | ${i.etaDeltaDays}` : "null");
const lines: string[] = [];
const keep = (i: GoalImpact | null) => {
  if (i) lines.push(i.line);
  return i;
};

const g = fixtureGoalContext();
const TARGET = 2257;
const day = (delta: number, planned = TARGET) => ({ targetKcal: TARGET, beforeKcal: planned, afterKcal: planned + delta });

// On track: a lunch swap inside ±10 % of the day's target.
const onTrack = keep(computeGoalImpact(g, { day: day(120, 2150) }));
check(onTrack?.line === "Keeps you on track for around Feb 18" && onTrack.etaDeltaDays === 0, "meal swap in band → keeps on track", show(onTrack));

// Over target: the real kcal delta, ETA holds.
const over = keep(computeGoalImpact(g, { day: day(320) }));
check(over?.line === "+320 kcal today. Around Feb 18 holds if the rest of the week is on target." && over.etaDeltaDays === 0, "burger swap over band → over-target sentence", show(over));
const under = keep(computeGoalImpact(g, { day: day(-400) }));
check(under?.line.startsWith("-400 kcal today.") === true, "big cut under band → same sentence, signed", show(under));

// Later: 45 → 30 min sessions on 4 lift days (less burn on a cut).
const later = keep(computeGoalImpact(g, { sessionMinutes: { before: 45, after: 30 }, liftDaysPerWeek: 4 }));
check(!!later && later.etaDeltaDays !== null && later.etaDeltaDays >= 4, "shorter sessions → etaDeltaDays computed, later", show(later));
check(/^Pushes your estimate ~\d+ (days|weeks?) later, to around [A-Z][a-z]{2} \d{1,2}$/.test(later?.line ?? ""), "later line shape", later?.line);
const fewerDays = keep(computeGoalImpact(g, { sessionsPerWeek: { before: 4, after: 2 } }));
check((fewerDays?.etaDeltaDays ?? 0) > 7 && fewerDays!.line.startsWith("Pushes your estimate"), "4 → 2 lift days → later", show(fewerDays));
const moreFood = keep(computeGoalImpact(g, { kcalPerDay: 250 }));
check((moreFood?.etaDeltaDays ?? 0) > 7, "+250 kcal/day every day → later", show(moreFood));

// Earlier: more training at the same intake.
const earlier = keep(computeGoalImpact(g, { sessionsPerWeek: { before: 4, after: 6 } }));
check(!!earlier && (earlier.etaDeltaDays ?? 0) <= -4 && /^Brings your estimate ~\d+ (days|weeks?) earlier, to around /.test(earlier.line), "4 → 6 lift days → earlier", show(earlier));
const longer = keep(computeGoalImpact(g, { sessionMinutes: { before: 30, after: 60 }, liftDaysPerWeek: 4 }));
check((longer?.etaDeltaDays ?? 0) < 0, "30 → 60 min sessions → earlier", show(longer));

// Persistent edit with no energy effect, and tiny shifts, keep the date.
const prefs = keep(computeGoalImpact(g, { persistent: true }));
check(prefs?.line === "Keeps you on track for around Feb 18" && prefs.etaDeltaDays === 0, "meals/day or prefs → keeps, etaDeltaDays 0", show(prefs));
const tiny = keep(computeGoalImpact(g, { sessionMinutes: { before: 45, after: 40 }, liftDaysPerWeek: 4 }));
check(tiny?.line === "Keeps you on track for around Feb 18" && typeof tiny.etaDeltaDays === "number", "5-min trim → keeps (delta still reported)", show(tiny));

// Status wording: never "on track" when behind or calibrating.
const behind = keep(computeGoalImpact(withStatus(g, "behind"), { persistent: true }));
check(behind?.line === "Keeps your estimate at around Feb 18", "behind → keeps your estimate", show(behind));
const calibrating = keep(computeGoalImpact(withStatus(g, "calibrating"), { day: day(50) }));
check(calibrating?.line === "Keeps your estimate at around Feb 18", "calibrating → keeps your estimate", show(calibrating));

// Stall: the change wipes out the deficit.
const stall = keep(computeGoalImpact(g, { kcalPerDay: 700 }));
check(stall?.etaDeltaDays === null && stall.line.startsWith("This would stall your estimate."), "deficit gone → stall line, null delta", show(stall));

// Gain: training length never speeds a gain estimate.
const gain = computeGoalImpact({ ...g, goalType: "muscle_gain", direction: "up", targetKg: 85, startKg: 78, trendKg: 79 }, { sessionMinutes: { before: 45, after: 30 } });
check(gain?.etaDeltaDays === 0, "gain: session length leaves the estimate", show(gain));

// No goal / no target / no ETA → null.
check(computeGoalImpact(null, { day: day(320) }) === null, "no goal → null");
check(computeGoalImpact(noTargetGoal(g), { persistent: true }) === null, "no target → null");
check(computeGoalImpact({ ...g, mode: "horizon", etaExpected: null }, { persistent: true }) === null, "horizon (no ETA) → null");

check(lines.every((l) => findBannedGoalWords(l).length === 0 && l.length <= 160), "every impact line: no banned words, ≤160 chars");
check(lines.every((l) => (l.match(/around/g) ?? []).length <= 1), "every impact line: ETA at most once");

// Proposal rows → change (orchestrator path).
const state = (goal = g) =>
  ({
    goal,
    targets: { kcal: TARGET, proteinG: 170, carbsG: 220, fatG: 70 },
    mealPlan: { meals: [{ kcal: 550 }, { kcal: 700 }, { kcal: 650 }, { kcal: 300 }] },
    plan: { days: [{ workoutId: "w1" }, { workoutId: null }, { workoutId: "w2" }, { workoutId: "w3" }, { workoutId: null }, { workoutId: "w4" }, { workoutId: null }] },
  }) as unknown as ReviseState;
const snap = (kcal: number) => ({ name: "x", kcal, proteinG: 0, carbsG: 0, fatG: 0 });
const burger: ReviseItem = { id: "lunch", kind: "meal_swap", slot: "lunch", before: snap(700), after: snap(1020), delta: { kcal: 320, proteinG: 0, carbsG: 0, fatG: 0 }, tags: [], reason: null };
const minutes: ReviseItem = { id: "session_minutes", kind: "session_minutes", before: 45, after: 30, droppedExercises: [], tags: [], reason: null };
const viaBurger = goalImpactFor(state(), [burger]);
check(viaBurger?.line.startsWith("+320 kcal today.") === true, "orchestrator: burger swap → over-target sentence with real delta", show(viaBurger));
const viaMinutes = goalImpactFor(state(), [minutes]);
check(viaMinutes !== null && viaMinutes.etaDeltaDays !== null && viaMinutes.etaDeltaDays > 0, "orchestrator: 30-min sessions → etaDeltaDays not null", show(viaMinutes));
check(goalImpactFor(state(), []) === null, "orchestrator: no rows → null");
check(goalImpactFor(state(null as never), [burger]) === null, "orchestrator: no goal → null");

// Contract: optional + nullable, old payloads still parse.
const old = { message: "Preview: x", changes: [], applied: false, source: "heuristic" };
check(CoachReviseResponseSchema.safeParse(old).success, "contract: payload without goalImpact parses");
check(CoachReviseResponseSchema.safeParse({ ...old, goalImpact: null }).success, "contract: goalImpact null parses");
check(CoachReviseResponseSchema.safeParse({ ...old, goalImpact: viaMinutes }).success, "contract: goalImpact object parses");

if (failures) {
  console.error(`\n${failures} failed`);
  process.exit(1);
}
console.log("\nassert-goal-impact: all passed");
