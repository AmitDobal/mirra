import type {
  CurrentPlanResponse,
  PlanDiff,
  PlanRebuildPreviewResponse,
} from "@mirra/contracts";
import { and, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { planJobs, preferences, profiles } from "../db/schema";
import type { MirraEnv } from "../env";
import { mondayOf, todayUtc } from "../lib/dates";
import { badRequest, notFound } from "../lib/errors";
import { newId } from "../lib/id";
import { parseJson } from "../lib/json";
import { getPersonalizationContext } from "../lib/personalization-context";
import { getPlanGenerator } from "../lib/plan-generator";
import type { PlanGenerateResult } from "../ports/plan-generator";
import { loadCurrentPlan } from "./plan-loaders";
import { persistGeneratedPlan } from "./persist-plan";

type PreviewStore = {
  reason: string;
  checkInId?: string;
  weekStart: string;
  parentPlanId: string | null;
  generated: PlanGenerateResult;
};

const materializeAfter = (
  generated: PlanGenerateResult,
  weekStart: string,
  version: number,
): CurrentPlanResponse => {
  const planId = `preview-plan`;
  const workoutIds = generated.workouts.map((_, i) => `preview-w${i}`);
  return {
    plan: {
      id: planId,
      version,
      status: "ready",
      weekStart,
      summary: generated.summary,
      source: "rebuild_preview",
      createdAt: Date.now(),
    },
    days: generated.days.map((d, i) => ({
      id: `preview-d${i}`,
      dayIndex: d.dayIndex,
      date: d.date,
      kind: d.kind,
      label: d.label ?? null,
      workoutId:
        d.workoutIndex != null ? (workoutIds[d.workoutIndex] ?? null) : null,
    })),
    workouts: generated.workouts.map((w, i) => ({
      id: workoutIds[i]!,
      title: w.title,
      durationMin: w.durationMin,
      focus: w.focus ?? null,
      calorieEst: w.calorieEst ?? null,
      sortOrder: i,
      exercises: w.exercises.map((ex, j) => ({
        id: `preview-e${i}-${j}`,
        name: ex.name,
        cue: ex.cue ?? null,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        restSec: ex.restSec ?? null,
        sortOrder: j,
        swapGroup: ex.swapGroup ?? null,
      })),
    })),
  };
};

const computeDiffs = (
  before: CurrentPlanResponse,
  after: CurrentPlanResponse,
): PlanDiff[] => {
  const diffs: PlanDiff[] = [];
  const bSum = before.plan?.summary;
  const aSum = after.plan?.summary;
  if (bSum && aSum) {
    if (bSum.kcalTarget !== aSum.kcalTarget) {
      diffs.push({ field: "summary.kcalTarget", before: bSum.kcalTarget, after: aSum.kcalTarget });
    }
    if (bSum.proteinG !== aSum.proteinG) {
      diffs.push({ field: "summary.proteinG", before: bSum.proteinG, after: aSum.proteinG });
    }
    if (bSum.outcomeLine !== aSum.outcomeLine) {
      diffs.push({ field: "summary.outcomeLine", before: bSum.outcomeLine, after: aSum.outcomeLine });
    }
  }
  const maxDays = Math.max(before.days.length, after.days.length);
  for (let i = 0; i < maxDays; i++) {
    const bd = before.days[i];
    const ad = after.days[i];
    if ((bd?.kind ?? null) !== (ad?.kind ?? null)) {
      diffs.push({ field: `days.${i}.kind`, before: bd?.kind ?? null, after: ad?.kind ?? null });
    }
    if ((bd?.label ?? null) !== (ad?.label ?? null)) {
      diffs.push({ field: `days.${i}.label`, before: bd?.label ?? null, after: ad?.label ?? null });
    }
  }
  if (before.workouts.length !== after.workouts.length) {
    diffs.push({
      field: "workouts.count",
      before: before.workouts.length,
      after: after.workouts.length,
    });
  }
  return diffs;
};

/** Rebuild: shift train days forward one slot when reason mentions skip/miss. */
const rebuildTrainDays = (trainDays: number[], reason: string): number[] => {
  const lower = reason.toLowerCase();
  if (!lower.includes("skip") && !lower.includes("miss")) return trainDays;
  return trainDays
    .map((d) => (d >= 7 ? 1 : d + 1))
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .sort((a, b) => a - b);
};

export const previewRebuild = async (
  db: AppDB,
  env: MirraEnv,
  userId: string,
  reason: string,
  checkInId?: string,
): Promise<PlanRebuildPreviewResponse> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const [prefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  if (!profile?.onboardingCompletedAt || !prefs) {
    throw badRequest("Onboarding incomplete — PUT /v1/onboarding first");
  }

  const before = await loadCurrentPlan(db, userId);
  if (!before.plan) throw badRequest("No current plan — generate first");

  const weekStart = before.plan.weekStart || mondayOf(todayUtc());
  const trainDays = rebuildTrainDays(
    JSON.parse(prefs.trainDaysJson) as number[],
    reason,
  );
  const generator = getPlanGenerator(env, { db, userId });
  const context = await getPersonalizationContext(env, db).build({
    userId,
    feature: "workout_plan",
    subjectId: weekStart,
    localDate: todayUtc(),
    overrides: { trainDays },
  });
  const generated = await generator.generate({
    userId,
    timezone: profile.timezone,
    weekStart,
    kind: "rebuild",
    prefsJson: JSON.stringify({
      primaryGoal: prefs.primaryGoal,
      experience: prefs.experience,
      trainDays,
      sessionMinutes: prefs.sessionMinutes,
    }),
    profileJson: JSON.stringify({
      weightKg: profile.weightKg,
      goalWeightKg: profile.goalWeightKg,
      pace: profile.pace,
    }),
    context,
  });

  // Slight kcal nudge so diffs are visible when days unchanged.
  if (reason.toLowerCase().includes("deload")) {
    generated.summary = {
      ...generated.summary,
      kcalTarget: Math.max(1400, generated.summary.kcalTarget - 150),
      outcomeLine: "Deload week — volume protected, fuel eased",
    };
  }

  const after = materializeAfter(generated, weekStart, before.plan.version + 1);
  const diffs = computeDiffs(before, after);
  const previewToken = newId();
  const store: PreviewStore = {
    reason,
    checkInId,
    weekStart,
    parentPlanId: before.plan.id,
    generated,
  };

  await db.insert(planJobs).values({
    id: previewToken,
    userId,
    kind: "rebuild_preview",
    status: "done",
    inputJson: JSON.stringify(store),
    planId: before.plan.id,
    createdAt: new Date(),
    finishedAt: new Date(),
  });

  return { before, after, diffs, previewToken };
};

export const applyRebuild = async (
  db: AppDB,
  userId: string,
  previewToken: string,
): Promise<CurrentPlanResponse> => {
  const [job] = await db
    .select()
    .from(planJobs)
    .where(
      and(
        eq(planJobs.id, previewToken),
        eq(planJobs.userId, userId),
        eq(planJobs.kind, "rebuild_preview"),
      ),
    )
    .limit(1);
  if (!job) throw notFound("Rebuild preview not found");

  const store = parseJson<PreviewStore | null>(job.inputJson, null);
  if (!store?.generated) throw badRequest("Invalid preview token payload");

  await persistGeneratedPlan({
    db,
    userId,
    weekStart: store.weekStart,
    source: "rebuild",
    generated: store.generated,
    parentPlanId: store.parentPlanId,
  });

  return loadCurrentPlan(db, userId);
};
