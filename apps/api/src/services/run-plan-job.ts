import { eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { planJobs, preferences, profiles } from "../db/schema";
import type { MirraEnv } from "../env";
import { mondayOf, todayUtc } from "../lib/dates";
import { badRequest } from "../lib/errors";
import { newId } from "../lib/id";
import { getPlanGenerator } from "../lib/plan-generator";
import { persistGeneratedPlan } from "./persist-plan";

type RunOpts = {
  db: AppDB;
  env: MirraEnv;
  userId: string;
  weekStart?: string;
};

/** Create plan_job + PlanGenerator fill of plans/days/workouts. */
export const runPlanGenerateJob = async ({
  db,
  env,
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
    const generator = getPlanGenerator(env, { db, userId });
    const generated = await generator.generate({
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

    const { planId } = await persistGeneratedPlan({
      db,
      userId,
      weekStart,
      source: "onboarding",
      generated,
    });

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
