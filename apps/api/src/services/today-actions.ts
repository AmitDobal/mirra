import {
  buildMacroMeter,
  type AccountabilityScenario,
  type DailyGoal,
  type GoalKind,
  type Hydration,
  type MacroMeter,
  type NextAction,
  type TodayActionsResponse,
} from "@mirra/contracts";

import { scenarioHeadline } from "./accountability-copy";
import type { ScenarioFacts } from "./accountability-scenarios";

/** Pure inputs: everything comes from the shared personal-day context + a few extras. */
export type TodayActionsInput = {
  date: string;
  tz: string;
  scenario: AccountabilityScenario;
  facts: ScenarioFacts;
  mealCount: number;
  workout: { id: string; title: string; durationMin: number; exerciseCount: number } | null;
  carbsG: { target: number; logged: number };
  fatG: { target: number; logged: number };
  hydration: Hydration | null;
};

/** A meal slot is "due" once the local hour passes its cutoff. */
const MEAL_SLOT_CUTOFF_HOURS = [10, 14, 21] as const;
const PROTEIN_DONE_RATIO = 0.95;
const MAX_GOALS = 6;

const CTA_LABEL: Record<GoalKind, string> = {
  workout: "Start workout",
  meal: "Log meal",
  protein: "Log meal",
  checkin: "Check in",
  cardio: "Start cardio",
  water: "Log water",
};

/** Default order when no scenario overrides it. */
const PLAN_ORDER: readonly GoalKind[] = ["workout", "meal", "protein", "checkin", "water"];

/** Scenario-aware priority; first pending kind in the list wins. */
const SCENARIO_ORDER: Partial<Record<AccountabilityScenario, readonly GoalKind[]>> = {
  LOW_READINESS: ["checkin"],
  MISSED_LIFT: ["workout"],
  STREAK_BREAK: ["checkin", "workout"],
  UNDER_PROTEIN: ["meal", "protein"],
  UNDER_EATING: ["meal", "protein"],
  OVER_KCAL: ["protein", "workout"],
};

const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;

const litres = (ml: number): number => Math.round(ml / 100) / 10;

const mealSlotsDue = (hourLocal: number): number =>
  MEAL_SLOT_CUTOFF_HOURS.filter((cutoff) => hourLocal >= cutoff).length;

const FUEL_LOG_ROUTE = "/(tabs)/fuel?sheet=log";

const workoutGoal = (i: TodayActionsInput): DailyGoal | null => {
  if (!i.workout) return null;
  const { workout, facts } = i;
  const skipped = i.scenario === "LOW_READINESS" && !facts.workoutDone;
  return {
    id: `${i.date}:workout:${workout.id}`,
    kind: "workout",
    title: clip(workout.title, 40),
    subtitle: `${workout.durationMin} min · ${workout.exerciseCount} exercises`,
    status: facts.workoutDone ? "done" : skipped ? "skipped" : "pending",
    ctaRoute: `/workout/${workout.id}`,
    metric: null,
  };
};

const mealGoal = (i: TodayActionsInput): DailyGoal | null => {
  const due = mealSlotsDue(i.facts.hourLocal);
  if (due < 1) return null;
  return {
    id: `${i.date}:meal`,
    kind: "meal",
    title: "Log your meals",
    subtitle: `${i.mealCount} of ${due} meals logged`,
    status: i.mealCount >= due ? "done" : "pending",
    ctaRoute: FUEL_LOG_ROUTE,
    metric: { label: "kcal", current: i.facts.kcalLogged, target: i.facts.kcalTarget },
  };
};

const proteinGoal = (i: TodayActionsInput): DailyGoal | null => {
  const target = Math.round(i.facts.proteinGTarget);
  if (target <= 0) return null;
  const logged = Math.round(i.facts.proteinGLogged);
  const done = i.facts.proteinGLogged >= i.facts.proteinGTarget * PROTEIN_DONE_RATIO;
  return {
    id: `${i.date}:protein`,
    kind: "protein",
    title: `Hit ${target}g protein`,
    subtitle: done ? "Target reached" : `${Math.max(0, target - logged)}g to go`,
    // More protein is never "over".
    status: done ? "done" : "pending",
    ctaRoute: `${FUEL_LOG_ROUTE}&focus=protein`,
    metric: { label: "g", current: logged, target },
  };
};

const checkinGoal = (i: TodayActionsInput): DailyGoal => {
  const { checkInDone, checkInStatus } = i.facts;
  return {
    id: `${i.date}:checkin`,
    kind: "checkin",
    title: "Daily check-in",
    subtitle: checkInDone ? `Logged: ${(checkInStatus ?? "done").replace("_", " ")}` : "Log how today went",
    status: !checkInDone ? "pending" : checkInStatus === "skipped" ? "skipped" : "done",
    ctaRoute: "/check-in",
    metric: null,
  };
};

const waterGoal = (i: TodayActionsInput): DailyGoal | null => {
  if (!i.hydration) return null;
  const { targetMl, loggedMl } = i.hydration;
  return {
    id: `${i.date}:water`,
    kind: "water",
    title: `Drink ${litres(targetMl)} L water`,
    subtitle: loggedMl >= targetMl ? "Target reached" : `${litres(targetMl - loggedMl)} L to go`,
    status: loggedMl >= targetMl ? "done" : "pending",
    ctaRoute: "/(tabs)/fuel?sheet=water",
    metric: { label: "L", current: litres(loggedMl), target: litres(targetMl) },
  };
};

export const buildGoals = (i: TodayActionsInput): DailyGoal[] => {
  const goals = [workoutGoal(i), mealGoal(i), proteinGoal(i), checkinGoal(i), waterGoal(i)];
  return goals.filter((g): g is DailyGoal => g !== null).slice(0, MAX_GOALS);
};

export const buildMacros = (i: TodayActionsInput): MacroMeter[] => [
  buildMacroMeter("kcal", i.facts.kcalTarget, i.facts.kcalLogged),
  buildMacroMeter("proteinG", i.facts.proteinGTarget, i.facts.proteinGLogged),
  buildMacroMeter("carbsG", i.carbsG.target, i.carbsG.logged),
  buildMacroMeter("fatG", i.fatG.target, i.fatG.logged),
];

/** First pending goal by scenario-aware priority, then plan order. */
export const pickNextGoal = (
  goals: DailyGoal[],
  scenario: AccountabilityScenario,
): DailyGoal | null => {
  const pending = goals.filter((g) => g.status === "pending");
  const order = [...(SCENARIO_ORDER[scenario] ?? []), ...PLAN_ORDER];
  for (const kind of order) {
    const hit = pending.find((g) => g.kind === kind);
    if (hit) return hit;
  }
  return pending[0] ?? null;
};

const tone = (s: AccountabilityScenario): NextAction["tone"] => {
  if (s === "OVER_KCAL" || s === "MISSED_LIFT" || s === "STREAK_BREAK") return "alert";
  if (s === "ON_TRACK") return "good";
  return "warn";
};

/** Scenario headline when a call-out applies; otherwise a short reason per goal kind. */
const reasonFor = (goal: DailyGoal, i: TodayActionsInput): string => {
  if (i.scenario !== "ON_TRACK") return scenarioHeadline(i.scenario, i.facts);
  switch (goal.kind) {
    case "workout":
      return `Today's lift: ${goal.title}. Log sets when you finish.`;
    case "meal":
    case "protein":
      return scenarioHeadline("ON_TRACK", i.facts);
    case "checkin":
      return "Check in to keep your streak honest.";
    default:
      return "Keep water steady through the day.";
  }
};

export const buildNextAction = (
  goals: DailyGoal[],
  i: TodayActionsInput,
): NextAction | null => {
  const goal = pickNextGoal(goals, i.scenario);
  if (!goal) return null;
  return {
    goalId: goal.id,
    kind: goal.kind,
    title: goal.title,
    ctaRoute: goal.ctaRoute,
    reason: clip(reasonFor(goal, i), 90),
    ctaLabel: CTA_LABEL[goal.kind],
    tone: tone(i.scenario),
  };
};

/** Pure: no I/O. Hero, checklist and macro meters for one local day. */
export const buildTodayActions = (i: TodayActionsInput): TodayActionsResponse => {
  const goals = buildGoals(i);
  return {
    date: i.date,
    tz: i.tz,
    next: buildNextAction(goals, i),
    goals,
    macros: buildMacros(i),
    hydration: i.hydration,
    scenario: i.scenario,
  };
};
