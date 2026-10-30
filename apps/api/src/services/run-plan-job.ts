import { and, desc, eq } from "drizzle-orm";

import { heuristicPlanGenerator } from "../adapters/heuristic-plan-generator";
import type { AppDB } from "../db";
import {
  planDays,
  planJobs,
  plans,
  preferences,
  profiles,
  workoutExercises,
  workouts,
} from "../db/schema";
import { mondayOf, todayUtc } from "../lib/dates";
import { badRequest } from "../lib/errors";
import { newId } from "../lib/id";

type RunOpts = {
  db: AppDB;
  userId: string;
  weekStart?: string;
};

/** Create plan_job + heuristic fill of plans/days/workouts (sync local stub). */
export const runPlanGenerateJob = async ({
  db,
  userId,
  weekStart: weekStartOpt,
}: RunOpts): Promise<{ jobId: string }> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const [prefs] = await db
    .select()
    .from(preferences)
    .where(eq(preferences.userId, userId))
    .limit(1);
  if (!profile?.onboardingCompletedAt || !prefs) {
    throw badRequest("Onboarding incomplete — PUT /v1/onboarding first");
  }

  const weekStart = weekStartOpt ?? mondayOf(todayUtc());
  const jobId = newId();
  const now = new Date();

  await db.insert(planJobs).values({
    id: jobId,
    userId,
    kind: "generate",
    status: "running",
    inputJson: JSON.stringify({ weekStart }),
    createdAt: now,
  });

  try {
    const generated = await heuristicPlanGenerator.generate({
      userId,
      timezone: profile.timezone,
      weekStart,
      kind: "generate",
      prefsJson: JSON.stringify({
        primaryGoal: prefs.primaryGoal,
        experience: prefs.experience,
        trainDays: JSON.parse(prefs.trainDaysJson) as number[],
        sessionMinutes: prefs.sessionMinutes,
      }),
      profileJson: JSON.stringify({
        weightKg: profile.weightKg,
        goalWeightKg: profile.goalWeightKg,
        pace: profile.pace,
      }),
    });

    const [latest] = await db
      .select({ version: plans.version })
      .from(plans)
      .where(eq(plans.userId, userId))
      .orderBy(desc(plans.version))
      .limit(1);
    const version = (latest?.version ?? 0) + 1;

    await db
      .update(plans)
      .set({ status: "superseded" })
      .where(and(eq(plans.userId, userId), eq(plans.status, "ready")));

    const planId = newId();
    await db.insert(plans).values({
      id: planId,
      userId,
      version,
      status: "ready",
      weekStart,
      summaryJson: JSON.stringify(generated.summary),
      source: "onboarding",
      createdAt: now,
    });

    const workoutIds: string[] = [];
    for (let i = 0; i < generated.workouts.length; i++) {
      const w = generated.workouts[i]!;
      const workoutId = newId();
      workoutIds.push(workoutId);
      await db.insert(workouts).values({
        id: workoutId,
        planId,
        title: w.title,
        durationMin: w.durationMin,
        focus: w.focus ?? null,
        calorieEst: w.calorieEst ?? null,
        sortOrder: i,
      });
      for (let j = 0; j < w.exercises.length; j++) {
        const ex = w.exercises[j]!;
        await db.insert(workoutExercises).values({
          id: newId(),
          workoutId,
          name: ex.name,
          cue: ex.cue ?? null,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          restSec: ex.restSec ?? null,
          sortOrder: j,
          swapGroup: ex.swapGroup ?? null,
        });
      }
    }

    for (const day of generated.days) {
      const workoutId =
        day.workoutIndex != null ? (workoutIds[day.workoutIndex] ?? null) : null;
      await db.insert(planDays).values({
        id: newId(),
        planId,
        dayIndex: day.dayIndex,
        date: day.date,
        kind: day.kind,
        label: day.label ?? null,
        workoutId,
      });
    }

    await db
      .update(planJobs)
      .set({ status: "done", planId, finishedAt: new Date() })
      .where(eq(planJobs.id, jobId));

    return { jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plan generation failed";
    await db
      .update(planJobs)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(planJobs.id, jobId));
    throw err;
  }
};
