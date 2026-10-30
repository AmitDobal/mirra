import { getDb } from "../client";
import { mondayOf, todayUtc } from "../dates";
import { LOCAL_USER_ID, newId, nowMs } from "../ids";
import { parseJson, toJson } from "../json";
import type {
  LocalExercise,
  LocalPlan,
  LocalPlanDay,
  LocalWorkout,
  PlanSummary,
  TodayBundle,
} from "../types";
import type { HeuristicPlanResult } from "../../lib/local/plan-generator";

type PlanRow = {
  id: string;
  version: number;
  status: string;
  week_start: string;
  summary_json: string;
};

type DayRow = {
  id: string;
  day_index: number;
  date: string;
  kind: string;
  label: string | null;
  workout_id: string | null;
};

type WorkoutRow = {
  id: string;
  title: string;
  duration_min: number;
  focus: string | null;
  calorie_est: number | null;
};

type ExRow = {
  id: string;
  name: string;
  cue: string | null;
  target_sets: number;
  target_reps: string;
  rest_sec: number | null;
  swap_group: string | null;
};

const emptySummary = (): PlanSummary => ({
  kcalTarget: 2000,
  proteinG: 140,
  carbsG: 200,
  fatG: 60,
  outcomeLine: "",
});

const loadExercises = async (
  workoutId: string,
): Promise<LocalExercise[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<ExRow>(
    "SELECT * FROM workout_exercises WHERE workout_id = ? ORDER BY sort_order ASC",
    workoutId,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    cue: r.cue,
    targetSets: r.target_sets,
    targetReps: r.target_reps,
    restSec: r.rest_sec,
    swapGroup: r.swap_group,
  }));
};

const loadWorkout = async (workoutId: string | null): Promise<LocalWorkout | null> => {
  if (!workoutId) return null;
  const db = await getDb();
  const w = await db.getFirstAsync<WorkoutRow>(
    "SELECT * FROM workouts WHERE id = ?",
    workoutId,
  );
  if (!w) return null;
  return {
    id: w.id,
    title: w.title,
    durationMin: w.duration_min,
    focus: w.focus,
    calorieEst: w.calorie_est,
    exercises: await loadExercises(w.id),
  };
};

const hydratePlan = async (plan: PlanRow): Promise<LocalPlan> => {
  const db = await getDb();
  const days = await db.getAllAsync<DayRow>(
    "SELECT * FROM plan_days WHERE plan_id = ? ORDER BY day_index ASC",
    plan.id,
  );
  const hydrated: LocalPlanDay[] = [];
  for (const d of days) {
    hydrated.push({
      id: d.id,
      dayIndex: d.day_index,
      date: d.date,
      kind: d.kind,
      label: d.label,
      workout: await loadWorkout(d.workout_id),
    });
  }
  return {
    id: plan.id,
    version: plan.version,
    status: plan.status,
    weekStart: plan.week_start,
    summary: parseJson(plan.summary_json, emptySummary()),
    days: hydrated,
  };
};

export type SavePlanInput = {
  readonly userId?: string;
  readonly weekStart?: string;
  readonly source?: "onboarding" | "rebuild" | "manual";
  readonly parentPlanId?: string | null;
  readonly generated: HeuristicPlanResult;
};

export const savePlan = async (input: SavePlanInput): Promise<LocalPlan> => {
  const userId = input.userId ?? LOCAL_USER_ID;
  const db = await getDb();
  const ts = nowMs();
  const weekStart = input.weekStart ?? mondayOf(todayUtc());

  const prev = await db.getFirstAsync<{ version: number }>(
    "SELECT MAX(version) AS version FROM plans WHERE user_id = ?",
    userId,
  );
  const version = (prev?.version ?? 0) + 1;

  await db.runAsync(
    "UPDATE plans SET status = 'superseded' WHERE user_id = ? AND status = 'ready'",
    userId,
  );

  const planId = newId("plan");
  const { generated } = input;
  await db.runAsync(
    `INSERT INTO plans (id, user_id, version, status, week_start, summary_json, source, parent_plan_id, created_at)
     VALUES (?, ?, ?, 'ready', ?, ?, ?, ?, ?)`,
    planId,
    userId,
    version,
    weekStart,
    toJson(generated.summary),
    input.source ?? "onboarding",
    input.parentPlanId ?? null,
    ts,
  );

  const workoutIds: string[] = [];
  for (let i = 0; i < generated.workouts.length; i++) {
    const w = generated.workouts[i]!;
    const wid = newId("wo");
    workoutIds.push(wid);
    await db.runAsync(
      `INSERT INTO workouts (id, plan_id, title, duration_min, focus, calorie_est, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      wid,
      planId,
      w.title,
      w.durationMin,
      w.focus ?? null,
      w.calorieEst ?? null,
      i,
    );
    for (let j = 0; j < w.exercises.length; j++) {
      const e = w.exercises[j]!;
      await db.runAsync(
        `INSERT INTO workout_exercises (
          id, workout_id, name, cue, target_sets, target_reps, rest_sec, sort_order, swap_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId("ex"),
        wid,
        e.name,
        e.cue ?? null,
        e.targetSets,
        e.targetReps,
        e.restSec ?? null,
        j,
        e.swapGroup ?? null,
      );
    }
  }

  for (const d of generated.days) {
    const workoutId =
      d.workoutIndex != null ? (workoutIds[d.workoutIndex] ?? null) : null;
    await db.runAsync(
      `INSERT INTO plan_days (id, plan_id, day_index, date, kind, label, workout_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      newId("day"),
      planId,
      d.dayIndex,
      d.date,
      d.kind,
      d.label ?? null,
      workoutId,
    );
  }

  const row = await db.getFirstAsync<PlanRow>("SELECT * FROM plans WHERE id = ?", planId);
  return hydratePlan(row!);
};

export const getCurrentPlan = async (
  userId: string = LOCAL_USER_ID,
): Promise<LocalPlan | null> => {
  const db = await getDb();
  const plan = await db.getFirstAsync<PlanRow>(
    `SELECT * FROM plans WHERE user_id = ? AND status = 'ready'
     ORDER BY version DESC LIMIT 1`,
    userId,
  );
  if (!plan) return null;
  return hydratePlan(plan);
};

export const getToday = async (
  userId: string = LOCAL_USER_ID,
  date: string = todayUtc(),
): Promise<TodayBundle> => {
  const plan = await getCurrentPlan(userId);
  if (!plan) {
    return { date, planId: null, day: null, summary: null, checkInDue: true };
  }
  const day = plan.days.find((d) => d.date === date) ?? null;
  const db = await getDb();
  const checkIn = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM check_ins WHERE user_id = ? AND local_date = ?",
    userId,
    date,
  );
  return {
    date,
    planId: plan.id,
    day,
    summary: plan.summary,
    checkInDue: !checkIn,
  };
};
