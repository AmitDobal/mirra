/**
 * Test fixture (arch §3 `goal-82-75-steady`, same numbers as the API seed): engine projection
 * → `GoalResponse`, mirroring `apps/api/src/lib/goal/response.ts`. Used by `*.test.ts` only.
 */
import { goalEngine as G, projectGoal, type GoalInput, type GoalResponse } from "@mirra/contracts";

export const START = "2026-11-04";
export const DAY35 = "2026-12-09";

const KG = [
  81.7, 81.3, 81.2, 81.4, 81.2, 81.3, 80.9, 81.2, 80.8, 80.6, 80.9, 80.7, 80.8, 80.4, 80.7, 80.3, 80.1, 80.3,
  80.2, 80.2, 79.9, 80.1, 79.8, 79.6, 79.8, 79.6, 79.7, 79.4, 79.6, 79.3, 79.1, 79.3, 79.1, 79.2, 78.8, 79.1,
];
const window28 = (n: number) => Array.from({ length: n }, (_, i) => G.addDays("2026-11-12", i));

export const fixtureInput = (over: Partial<GoalInput["profile"]> = {}, today = DAY35): GoalInput => ({
  profile: {
    goalType: "fat_loss", pace: "steady", experience: "months", sex: "male", ageYears: 29, heightCm: 180,
    startWeightKg: 82, targetWeightKg: 75, trainDaysPerWeek: 4, units: "metric", ...over,
  },
  startDate: START,
  today,
  logs: KG.map((kg, d) => ({ date: G.addDays(START, d), kg })).filter((l) => l.date <= today),
  sessions: window28(28).filter((_, i) => i % 7 < 4).map((date, i) => ({ date, done: i % 4 !== 3 })).filter((s) => s.date <= today),
  fuelDays: window28(20).map((date, i) => ({ date, onTarget: i % 2 === 0 })).filter((f) => f.date <= today),
  checkInDates: window28(28).filter((_, i) => i % 4 !== 3).filter((d) => d <= today),
});

const PRIMARY: Record<string, NonNullable<GoalResponse["plan"]>["primaryGoal"]> = {
  fat_loss: "lose_fat",
  muscle_gain: "build_muscle",
  recomp: "recomp",
  strength: "performance",
  general_fitness: "consistency",
};

/** Engine run → wire body. `originalEta` = the day-0 expected ETA (as `goal_plans.eta_expected`). */
export const responseOf = (input: GoalInput): GoalResponse => {
  const g = projectGoal(input);
  const day0 = projectGoal({ profile: input.profile, startDate: input.startDate, today: input.startDate });
  return {
    engineVersion: g.engineVersion,
    plan: {
      version: 1,
      goalType: g.goalType,
      primaryGoal: PRIMARY[g.goalType]!,
      pace: g.pace,
      direction: g.direction,
      mode: g.mode,
      startDate: g.startDate,
      startWeightKg: g.startWeightKg,
      targetWeightKg: g.targetWeightKg,
      targetEffectiveKg: g.targetEffectiveKg,
      paceRateKg: g.paceRateKg,
      kcalHint: g.kcalHint,
      committedAt: null,
      originalEta: day0.band.expected,
    },
    status: g.status,
    band: g.band,
    whatIf: g.whatIf,
    trendKg: g.trendKg,
    toGoKg: g.toGoKg,
    adherence: {
      score: g.adherence.score,
      training: g.adherence.training,
      fuel: g.adherence.fuel,
      checkIn: g.adherence.checkIn,
      counts: g.adherence.counts,
    },
    milestones: g.milestones.slice(0, 8),
    flags: g.flags,
    chart: g.chart,
  };
};

export const day35 = (): GoalResponse => responseOf(fixtureInput());
