/**
 * Seed helpers for the goal API asserts (AMI-179). Fixture `goal-82-75-steady` = arch §3:
 * male 29 y, 180 cm, 82 → 75 kg steady, lose_fat, 4 days, start 2026-11-04, logs through day 35.
 */
import type { DatabaseSync, SQLInputValue } from "node:sqlite";

import { goalEngine as G, type GoalInput } from "@mirra/contracts";

export const START = "2026-11-04";
export const DAY35 = "2026-12-09";
export const KCAL_TARGET = 2257;
const DAY_MS = 86_400_000;
export const at = (date: string, hourUtc = 12) => Date.parse(`${date}T00:00:00.000Z`) + hourUtc * 3_600_000;

/** Same numbers as `assert-goal.ts` (AMI-178). */
export const FIXTURE_KG = [
  81.7, 81.3, 81.2, 81.4, 81.2, 81.3, 80.9, 81.2, 80.8, 80.6, 80.9, 80.7, 80.8, 80.4, 80.7, 80.3, 80.1, 80.3,
  80.2, 80.2, 79.9, 80.1, 79.8, 79.6, 79.8, 79.6, 79.7, 79.4, 79.6, 79.3, 79.1, 79.3, 79.1, 79.2, 78.8, 79.1,
];
const window28 = (n: number) => Array.from({ length: n }, (_, i) => G.addDays("2026-11-12", i));
export const fixtureSessions = window28(28)
  .filter((_, i) => i % 7 < 4)
  .map((date, i) => ({ date, done: i % 4 !== 3 }));
export const fixtureFuel = window28(20).map((date, i) => ({ date, onTarget: i % 2 === 0 }));
export const fixtureCheckIns = window28(28).filter((_, i) => i % 4 !== 3);

export const fixtureInput = (): GoalInput => ({
  profile: {
    goalType: "fat_loss", pace: "steady", experience: "months", sex: "male", ageYears: 29, heightCm: 180,
    startWeightKg: 82, targetWeightKg: 75, trainDaysPerWeek: 4, units: "metric",
  },
  startDate: START,
  today: DAY35,
  logs: FIXTURE_KG.map((kg, d) => ({ date: G.addDays(START, d), kg })),
  sessions: fixtureSessions,
  fuelDays: fixtureFuel,
  checkInDates: fixtureCheckIns,
});

export const seeder = (sqlite: DatabaseSync) => {
  const exec = (sql: string, ...args: unknown[]) => sqlite.prepare(sql).run(...(args as SQLInputValue[]));
  const count = (sql: string, ...args: unknown[]) =>
    Number((sqlite.prepare(sql).get(...(args as SQLInputValue[])) as { n: number } | undefined)?.n ?? -1);

  const user = (uid: string, opts: { onboarded?: number | null; goalWeightKg?: number | null; weightKg?: number; goal?: string } = {}) => {
    const t = at(START, 6);
    exec("INSERT INTO users (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)", uid, `t:${uid}`, t, t);
    exec(
      `INSERT INTO profiles (user_id, sex, age_years, height_cm, weight_kg, goal_weight_kg, pace, timezone, onboarding_completed_at, created_at, updated_at)
       VALUES (?, 'male', 29, 180, ?, ?, 'steady', 'UTC', ?, ?, ?)`,
      uid, opts.weightKg ?? 82, opts.goalWeightKg === undefined ? 75 : opts.goalWeightKg, opts.onboarded === undefined ? t : opts.onboarded, t, t,
    );
    exec(
      `INSERT INTO preferences (user_id, primary_goal, experience, train_days_json, units, updated_at)
       VALUES (?, ?, 'months', '[1,2,4,5]', 'metric', ?)`,
      uid, opts.goal ?? "lose_fat", t,
    );
  };

  /** Day-35 behaviour: daily weigh-ins, 16 lift days (12 done), 20 fuel days (10 on target), 21 check-ins. */
  const fixtureBehaviour = (uid: string) => {
    FIXTURE_KG.forEach((kg, d) => exec("INSERT INTO weight_logs (id, user_id, kg, logged_at) VALUES (?, ?, ?, ?)", `w-${uid}-${d}`, uid, kg, at(G.addDays(START, d), 7)));
    const created = at(START, 8);
    exec(
      "INSERT INTO plans (id, user_id, version, status, week_start, summary_json, source, created_at) VALUES (?, ?, 1, 'ready', '2026-11-09', ?, 'test', ?)",
      `p-${uid}`, uid, JSON.stringify({ kcalTarget: KCAL_TARGET, proteinG: 150, carbsG: 220, fatG: 70, outcomeLine: "" }), created,
    );
    exec("INSERT INTO workouts (id, plan_id, title, duration_min) VALUES (?, ?, 'Lift', 45)", `wk-${uid}`, `p-${uid}`);
    fixtureSessions.forEach((s, i) => {
      exec("INSERT INTO plan_days (id, plan_id, day_index, date, kind, workout_id) VALUES (?, ?, ?, ?, 'lift', ?)", `pd-${uid}-${i}`, `p-${uid}`, i, s.date, `wk-${uid}`);
      if (s.done) {
        exec("INSERT INTO workout_sessions (id, user_id, workout_id, started_at, ended_at) VALUES (?, ?, ?, ?, ?)", `ws-${uid}-${i}`, uid, `wk-${uid}`, at(s.date, 17), at(s.date, 18));
      }
    });
    fixtureFuel.forEach((f, i) => {
      const kcal = f.onTarget ? KCAL_TARGET : 3000;
      exec("INSERT INTO meals (id, user_id, eaten_at, name, meal_slot, kcal, created_at) VALUES (?, ?, ?, 'x', 'lunch', ?, ?)", `m-${uid}-${i}`, uid, at(f.date, 13), kcal, at(f.date, 13));
    });
    fixtureCheckIns.forEach((date, i) =>
      exec("INSERT INTO check_ins (id, user_id, local_date, status, created_at) VALUES (?, ?, ?, 'done', ?)", `c-${uid}-${i}`, uid, date, at(date, 20)),
    );
  };

  return { exec, count, user, fixtureBehaviour };
};

export const days = (n: number) => n * DAY_MS;
