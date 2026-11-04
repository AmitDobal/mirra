/**
 * D1 reads for the goal timeline (AMI-179). Batched round trips; every query filters `user_id`.
 */
import { goalEngine, type GoalInput, type PlanSummary } from "@mirra/contracts";
import { and, asc, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import {
  checkIns,
  goalPlans,
  meals,
  planDays,
  plans,
  preferences,
  profiles,
  progressPhotos,
  strengthEvents,
  users,
  weightLogs,
  workoutExercises,
  workoutSessions,
} from "../db/schema";
import { dayBoundsMs, localDateIn } from "../lib/dates";
import {
  localDay,
  pickStrengthLift,
  settingsOfPlan,
  profileInputOf,
  strengthNextOf,
  toFuelDays,
  toSessionDays,
  toWeightLogs,
} from "../lib/goal";
import { parseJson } from "../lib/json";
import { selectExerciseScores, selectSets90d, toCountMap, toScoreRow } from "./strength-store";

export type GoalPlanRow = typeof goalPlans.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type PrefsRow = typeof preferences.$inferSelect;

export type GoalBase = {
  profile: ProfileRow | undefined;
  prefs: PrefsRow | undefined;
  plan: GoalPlanRow | undefined;
  tz: string;
};

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 28;

export const selectActivePlan = (db: AppDB, userId: string) =>
  db
    .select()
    .from(goalPlans)
    .where(and(eq(goalPlans.userId, userId), eq(goalPlans.status, "active")))
    .limit(1);

/** Profile, preferences and the active plan in one round trip. */
export const loadGoalBase = async (db: AppDB, userId: string): Promise<GoalBase> => {
  const [p, pf, plan] = await db.batch([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select().from(preferences).where(eq(preferences.userId, userId)).limit(1),
    selectActivePlan(db, userId),
  ]);
  return { profile: p[0], prefs: pf[0], plan: plan[0], tz: p[0]?.timezone ?? "UTC" };
};

export const todayFor = (base: GoalBase, now: Date): string => localDateIn(base.tz, now);

/** Newest server-side write that can move the projection (ms). Future-dated weigh-ins are ignored. */
export const loadLatestChange = async (db: AppDB, userId: string, now: Date): Promise<number> => {
  const max = (q: ReturnType<typeof sql>) => sql`coalesce((${q}), 0)`;
  const [row] = await db
    .select({
      at: sql<number>`max(
        ${max(sql`select max(updated_at) from profiles where user_id = ${userId}`)},
        ${max(sql`select max(updated_at) from preferences where user_id = ${userId}`)},
        ${max(sql`select max(created_at) from meals where user_id = ${userId}`)},
        ${max(sql`select max(ended_at) from workout_sessions where user_id = ${userId}`)},
        ${max(sql`select max(created_at) from check_ins where user_id = ${userId}`)},
        ${max(sql`select max(taken_at) from progress_photos where user_id = ${userId} and taken_at <= ${now.getTime()}`)},
        ${max(sql`select max(logged_at) from weight_logs where user_id = ${userId} and logged_at <= ${now.getTime()}`)},
        ${max(sql`select max(created_at) from plans where user_id = ${userId}`)}
      )`,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Number(row?.at ?? 0);
};

/** Earliest weigh-in (backfill start weight). */
export const loadFirstWeight = async (db: AppDB, userId: string): Promise<number | null> => {
  const [row] = await db
    .select({ kg: weightLogs.kg })
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(asc(weightLogs.loggedAt))
    .limit(1);
  return row?.kg ?? null;
};

/** Planned lift days of the canonical lift on the current plan (reps + weekly frequency). */
const loadLiftPlan = async (db: AppDB, userId: string, canonicalId: string) => {
  const rows = await db
    .select({ dayId: planDays.id, reps: workoutExercises.targetReps })
    .from(planDays)
    .innerJoin(plans, eq(planDays.planId, plans.id))
    .innerJoin(workoutExercises, eq(workoutExercises.workoutId, planDays.workoutId))
    .where(and(eq(plans.userId, userId), eq(plans.status, "ready"), eq(workoutExercises.canonicalId, canonicalId)));
  return { reps: rows[0]?.reps ?? null, perWeek: new Set(rows.map((r) => r.dayId)).size };
};

/**
 * Everything the engine needs for `plan` on `today`: weigh-ins since start, planned vs done
 * lift days, fuel days and check-ins (28 d), progress photos, strength step-ups + next division.
 */
export const loadGoalInput = async (
  db: AppDB,
  userId: string,
  base: GoalBase,
  plan: GoalPlanRow,
  today: string,
  now: Date,
): Promise<GoalInput> => {
  const tz = base.tz;
  const settings = settingsOfPlan(plan, base.prefs?.units === "imperial" ? "imperial" : "metric");
  const winFrom = goalEngine.addDays(today, -(WINDOW_DAYS - 1)) > plan.startDate ? goalEngine.addDays(today, -(WINDOW_DAYS - 1)) : plan.startDate;
  // UTC bounds padded a day each side; rows are bucketed by the user's local day below.
  const sinceStart = new Date(dayBoundsMs(plan.startDate).start - DAY_MS);
  const sinceWin = new Date(dayBoundsMs(winFrom).start - DAY_MS);
  const until = new Date(dayBoundsMs(today).end + DAY_MS);

  const [logs, planned, done, mealRows, current, checks, photos, events, scores, sets] = await db.batch([
    db
      .select({ kg: weightLogs.kg, loggedAt: weightLogs.loggedAt })
      .from(weightLogs)
      .where(and(eq(weightLogs.userId, userId), gte(weightLogs.loggedAt, sinceStart), lte(weightLogs.loggedAt, until)))
      .orderBy(asc(weightLogs.loggedAt))
      .limit(800),
    db
      .select({ date: planDays.date, version: plans.version })
      .from(planDays)
      .innerJoin(plans, eq(planDays.planId, plans.id))
      .where(and(eq(plans.userId, userId), isNotNull(planDays.workoutId), gte(planDays.date, winFrom), lte(planDays.date, today))),
    db
      .select({ startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), isNotNull(workoutSessions.endedAt), gte(workoutSessions.startedAt, sinceWin), lte(workoutSessions.startedAt, until))),
    db
      .select({ eatenAt: meals.eatenAt, kcal: meals.kcal })
      .from(meals)
      .where(and(eq(meals.userId, userId), gte(meals.eatenAt, sinceWin), lte(meals.eatenAt, until))),
    db
      .select({ summaryJson: plans.summaryJson })
      .from(plans)
      .where(and(eq(plans.userId, userId), eq(plans.status, "ready")))
      .orderBy(desc(plans.version))
      .limit(1),
    db
      .select({ localDate: checkIns.localDate })
      .from(checkIns)
      .where(and(eq(checkIns.userId, userId), gte(checkIns.localDate, winFrom), lte(checkIns.localDate, today))),
    db
      .select({ takenAt: progressPhotos.takenAt })
      .from(progressPhotos)
      .where(and(eq(progressPhotos.userId, userId), gte(progressPhotos.takenAt, sinceStart), lte(progressPhotos.takenAt, until))),
    db
      .select({ n: sql<number>`count(*)` })
      .from(strengthEvents)
      .where(and(eq(strengthEvents.userId, userId), gte(strengthEvents.createdAt, new Date(now.getTime() - WINDOW_DAYS * DAY_MS)))),
    selectExerciseScores(db, userId),
    selectSets90d(db, userId, now.getTime()),
  ]);

  const kcalTarget = parseJson<Partial<PlanSummary>>(current[0]?.summaryJson ?? "{}", {}).kcalTarget ?? 2000;
  const weightLogsIn = toWeightLogs(logs, tz);
  const lift = pickStrengthLift(scores.map(toScoreRow), toCountMap(sets));
  const bw = weightLogsIn.at(-1)?.kg ?? base.profile?.weightKg ?? plan.startWeightKg;
  const next = lift
    ? strengthNextOf(
        lift,
        { sex: settings.sex === "male" || settings.sex === "female" ? settings.sex : null, bw, units: settings.units },
        await loadLiftPlan(db, userId, lift.exerciseId),
      )
    : null;

  return {
    profile: profileInputOf(settings, plan.startWeightKg),
    startDate: plan.startDate,
    today,
    logs: weightLogsIn,
    sessions: toSessionDays(planned, new Set(done.map((s) => localDay(tz, s.startedAt))), today),
    fuelDays: toFuelDays(mealRows, tz, kcalTarget, today),
    checkInDates: checks.map((c) => c.localDate),
    photoDates: photos.map((p) => localDay(tz, p.takenAt)),
    strength: { stepUps28d: Number(events[0]?.n ?? 0), next },
    plannedLine: parseJson<number[]>(plan.plannedLineJson, []),
  };
};
