import type { AccountabilityScenario, HistoryStats } from "@mirra/contracts";
import { and, eq, gte, lt } from "drizzle-orm";

import type { AppDB } from "../db";
import { checkIns, meals, workoutSessions } from "../db/schema";
import { dayBoundsMs, todayUtc } from "../lib/dates";
import { accountabilityTips } from "./accountability-copy";
import {
  isFuelWin,
  isHarshScenario,
  isOverKcal,
  pickScenarios,
  signedDelta,
  type ScenarioFacts,
} from "./accountability-scenarios";
import { buildHistorySummary } from "./history-summary";
import { defaultFuelTargets, loadCurrentPlan } from "./plan-loaders";
import { historyWindowDays, loadUserTenure, tenureLine } from "./user-tenure";
import { loadWeightLine } from "./weight-line";

/** Compact personal day snapshot for coach / insights (no secrets). */
export type PersonalDayContext = {
  localDate: string;
  fuel: {
    kcalTarget: number;
    kcalLogged: number;
    /** max(0, target - logged). Does NOT show overshoot; use kcalDelta / kcalOver. */
    kcalRemaining: number;
    /** Signed: logged - target (positive = over). */
    kcalDelta: number;
    /** max(0, kcalDelta). */
    kcalOver: number;
    proteinGTarget: number;
    proteinGLogged: number;
    proteinGRemaining: number;
    /** Signed: logged - target (negative = short). */
    proteinGDelta: number;
    mealCount: number;
  };
  training: {
    workoutTitle: string | null;
    workoutDone: boolean;
    sessionsThisWeek: number;
    plannedLiftDays: number;
  };
  checkIn: {
    done: boolean;
    status: string | null;
    streakDays: number;
  };
  /** One-line briefing for LLM / UI. */
  briefing: string;
  tips: string[];
  win: string | null;
  scenario: AccountabilityScenario;
  secondaryScenarios: AccountabilityScenario[];
  /** True when the primary scenario is a call-out. */
  harsh: boolean;
  /** Primary call-out copy (also tips[0] when harsh). */
  accountabilityTip: string | null;
  /** Token-cheap summary over `historyWindowDays` (no meal list). */
  historySummary: string;
  /** UTC join date (YYYY-MM-DD); null if unknown. */
  joinedAt: string | null;
  /** Whole days since join (min 0). */
  tenureDays: number;
  /** Days of history behind historySummary (1..21). */
  historyWindowDays: number;
  history: HistoryStats;
  /** Pure inputs behind scenario + copy; handed to the coach advisor. */
  facts: ScenarioFacts;
};

/** Hour used for time-of-day rules: UTC hour today, 24 for past days, 0 for future days. */
const hourFor = (localDate: string): number => {
  const today = todayUtc();
  if (localDate < today) return 24;
  if (localDate > today) return 0;
  return new Date().getUTCHours();
};

const startOfWeekUtc = (isoDate: string): number => {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  const day = d.getUTCDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

/** Build personalized context from D1 for the authenticated user. */
export const buildPersonalDayContext = async (
  db: AppDB,
  userId: string,
  localDate = todayUtc(),
): Promise<PersonalDayContext> => {
  const current = await loadCurrentPlan(db, userId);
  const targets = defaultFuelTargets(current.plan?.summary ?? null);
  const { start, end } = dayBoundsMs(localDate);

  const todayMeals = await db
    .select()
    .from(meals)
    .where(
      and(
        eq(meals.userId, userId),
        gte(meals.eatenAt, new Date(start)),
        lt(meals.eatenAt, new Date(end)),
      ),
    );
  const kcalLogged = Math.round(todayMeals.reduce((s, m) => s + m.kcal, 0));
  const proteinGLogged = todayMeals.reduce((s, m) => s + m.proteinG, 0);

  const day = current.days.find((d) => d.date === localDate) ?? null;
  const workout =
    day?.workoutId != null
      ? (current.workouts.find((w) => w.id === day.workoutId) ?? null)
      : null;

  const weekStart = startOfWeekUtc(localDate);
  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startedAt, new Date(weekStart)),
      ),
    );
  const completedToday = sessions.some((s) => {
    const t = s.startedAt instanceof Date ? s.startedAt.getTime() : Number(s.startedAt);
    return t >= start && t < end && s.endedAt != null;
  });

  const [checkIn] = await db
    .select()
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.localDate, localDate)))
    .limit(1);

  const tenure = await loadUserTenure(db, userId);
  const windowDays = historyWindowDays(tenure.tenureDays);
  const history = await buildHistorySummary(db, userId, localDate, {
    windowDays,
    kcalTarget: targets.kcal,
    plannedDays: current.days.map((d) => ({ date: d.date, workoutId: d.workoutId })),
  });

  const plannedLiftDays = current.days.filter(
    (d) => d.workoutId != null || /lift|push|pull|strength/i.test(d.kind),
  ).length;

  const kcalDelta = signedDelta(kcalLogged, targets.kcal);
  const proteinGDelta = Math.round(proteinGLogged - targets.proteinG);
  const kcalRemaining = Math.max(0, targets.kcal - kcalLogged);
  const proteinGRemaining = Math.max(0, Math.round(targets.proteinG - proteinGLogged));

  const facts: ScenarioFacts = {
    hourLocal: hourFor(localDate),
    kcalTarget: targets.kcal,
    kcalLogged,
    proteinGTarget: targets.proteinG,
    proteinGLogged,
    workoutTitle: workout?.title ?? null,
    workoutPlanned: workout != null,
    workoutDone: completedToday,
    checkInDone: Boolean(checkIn),
    checkInStatus: checkIn?.status ?? null,
    missedSessions7d: history.missedSessions,
    missedYesterday: history.missedYesterday,
    streakDays: history.streakDays,
    priorStreak: history.priorStreak,
    checkedInYesterday: history.checkedInYesterday,
  };
  const { primary, secondary } = pickScenarios(facts);
  const harsh = isHarshScenario(primary);
  const callouts = accountabilityTips([primary, ...secondary], facts);

  const tips: string[] = [...callouts];
  if (!callouts.length && proteinGRemaining >= 30) {
    tips.push(`Aim for ~${proteinGRemaining}g more protein today.`);
  }
  if (workout && !completedToday) {
    tips.push(`Today's lift: ${workout.title}. Log sets when you finish.`);
  }
  if (!workout && !completedToday) {
    tips.push("Rest or active recovery day — mobility counts.");
  }
  if (history.streakDays >= 3) {
    tips.push(`${history.streakDays}-day check-in streak. Keep the honesty streak going.`);
  }

  // Never celebrate fuel while over target; only in-band fuel is a win.
  let win: string | null = null;
  if (completedToday) win = "Session logged — that is the win.";
  else if (isFuelWin(facts)) {
    win = `Fuel on target: ${kcalLogged}/${targets.kcal} kcal, ${Math.round(proteinGLogged)}/${targets.proteinG}g protein.`;
  } else if (checkIn) win = "Check-in done. Showing up matters.";

  const fuelPart = isOverKcal(facts)
    ? `Fuel ${kcalLogged}/${targets.kcal} kcal (OVER by ${kcalDelta})`
    : `Fuel ${kcalLogged}/${targets.kcal} kcal (${kcalRemaining} left)`;
  const proteinPart =
    proteinGRemaining >= 10
      ? `Protein ${Math.round(proteinGLogged)}/${targets.proteinG}g (${proteinGRemaining}g short)`
      : `Protein ${Math.round(proteinGLogged)}/${targets.proteinG}g`;

  const weightPart = await loadWeightLine(db, userId);
  const joinedPart = tenureLine(tenure);

  const briefingParts = [
    fuelPart,
    proteinPart,
    workout
      ? completedToday
        ? `Workout done: ${workout.title}`
        : `Pending: ${workout.title}`
      : "No lift scheduled",
    checkIn ? `Check-in: ${checkIn.status}` : "Check-in open",
    ...(weightPart ? [weightPart] : []),
    ...(joinedPart ? [joinedPart] : []),
  ];

  const { text: historySummary, ...historyStats } = history;

  return {
    localDate,
    fuel: {
      kcalTarget: targets.kcal,
      kcalLogged,
      kcalRemaining,
      kcalDelta,
      kcalOver: Math.max(0, kcalDelta),
      proteinGTarget: targets.proteinG,
      proteinGLogged,
      proteinGRemaining,
      proteinGDelta,
      mealCount: todayMeals.length,
    },
    training: {
      workoutTitle: workout?.title ?? null,
      workoutDone: completedToday,
      sessionsThisWeek: sessions.filter((s) => s.endedAt != null).length,
      plannedLiftDays,
    },
    checkIn: {
      done: Boolean(checkIn),
      status: checkIn?.status ?? null,
      streakDays: history.streakDays,
    },
    briefing: briefingParts.join(" · "),
    tips: tips.slice(0, 3),
    win,
    scenario: primary,
    secondaryScenarios: secondary,
    harsh,
    accountabilityTip: callouts[0] ?? null,
    historySummary,
    joinedAt: tenure.joinedAt,
    tenureDays: tenure.tenureDays,
    historyWindowDays: windowDays,
    history: {
      loggedDays: historyStats.loggedDays,
      avgKcal: historyStats.avgKcal,
      avgKcalDeltaPct: historyStats.avgKcalDeltaPct,
      plannedSessions: historyStats.plannedSessions,
      missedSessions: historyStats.missedSessions,
      streakDays: historyStats.streakDays,
      lastCheckIns: historyStats.lastCheckIns,
      windowDays: historyStats.windowDays,
    },
    facts,
  };
};
