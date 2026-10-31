import type { AccountabilityScenario } from "@mirra/contracts";

import {
  isHarshScenario,
  isOverKcal,
  signedDelta,
  type ScenarioFacts,
} from "./accountability-scenarios";

/**
 * Deterministic call-out copy. Used by insights tips and the heuristic coach so the
 * Today tab and Coach tab always cite the same numbers. Harsh on behavior, never on the person.
 */

const proteinShortG = (f: ScenarioFacts): number =>
  Math.max(0, Math.round(f.proteinGTarget - f.proteinGLogged));

const overLine = (f: ScenarioFacts): string => {
  const over = signedDelta(f.kcalLogged, f.kcalTarget);
  const junk =
    proteinShortG(f) >= 20
      ? ` Over on kcal and ${proteinShortG(f)}g short on protein is junk calories.`
      : "";
  const action =
    f.hourLocal >= 24
      ? "Tomorrow starts at target: 40g protein first meal, no extras."
      : "Next meal: 40g protein plus veg, zero extras, and a 20-minute walk tonight.";
  return `You logged ${f.kcalLogged} against a ${f.kcalTarget} kcal target. That is OVER by ${over}.${junk} ${action}`;
};

const proteinLine = (f: ScenarioFacts): string => {
  const gap = proteinShortG(f);
  const action =
    f.hourLocal >= 24
      ? "Tomorrow: 40g protein at breakfast, not at 9pm."
      : `Two lean protein meals before bed, about ${Math.ceil(gap / 2)}g each.`;
  return `Protein is ${Math.round(f.proteinGLogged)} of ${Math.round(f.proteinGTarget)}g. ${gap}g short. ${action}`;
};

const liftLine = (f: ScenarioFacts): string => {
  const missed = `${f.missedSessions7d} missed session${f.missedSessions7d === 1 ? "" : "s"} in 7 days.`;
  if (f.workoutPlanned && !f.workoutDone) {
    return `${f.workoutTitle ?? "Today's lift"} is still not logged. ${missed} Do the 30-minute short version now, or move it to tomorrow with no extra rest day.`;
  }
  return `Yesterday's lift got skipped. ${missed} Today's session is non-negotiable.`;
};

const underEatingLine = (f: ScenarioFacts): string => {
  const gap = Math.max(0, f.kcalTarget - f.kcalLogged);
  const logged =
    f.kcalLogged === 0
      ? `Nothing logged against a ${f.kcalTarget} kcal target.`
      : `Only ${f.kcalLogged} of ${f.kcalTarget} kcal logged.`;
  return `${logged} Under-eating wrecks recovery and your next lift. Eat about ${Math.min(600, gap)} kcal with 40g protein now.`;
};

const streakLine = (f: ScenarioFacts): string => {
  if (!f.checkInDone && !f.checkedInYesterday && f.priorStreak >= 3) {
    return `Your ${f.priorStreak}-day check-in streak ended yesterday. Check in now; day one of the next streak starts today.`;
  }
  return `${f.missedSessions7d} missed sessions in 7 days. That is a pattern now. Lock the next session on the calendar.`;
};

const readinessLine = (f: ScenarioFacts): string => {
  const status = (f.checkInStatus ?? "low energy").replace("_", " ");
  return `Check-in says ${status}. Drop to about 70% volume, but hold protein at ${Math.round(f.proteinGTarget)}g. Recovery is built at the table.`;
};

const onTrackLine = (f: ScenarioFacts): string => {
  const lift = f.workoutDone ? ", lift done" : "";
  return `${f.kcalLogged}/${f.kcalTarget} kcal, ${Math.round(f.proteinGLogged)}/${Math.round(f.proteinGTarget)}g protein${lift}. On the number. Raise the bar next session.`;
};

/** One accountable line for a scenario, citing numbers from `facts`. */
export const scenarioLine = (s: AccountabilityScenario, f: ScenarioFacts): string => {
  switch (s) {
    case "OVER_KCAL":
      return overLine(f);
    case "UNDER_PROTEIN":
      return proteinLine(f);
    case "MISSED_LIFT":
      return liftLine(f);
    case "UNDER_EATING":
      return underEatingLine(f);
    case "STREAK_BREAK":
      return streakLine(f);
    case "LOW_READINESS":
      return readinessLine(f);
    case "ON_TRACK":
      return onTrackLine(f);
  }
};

/** Accountability tips: primary first, then secondary call-outs. ON_TRACK yields none. */
export const accountabilityTips = (
  scenarios: AccountabilityScenario[],
  f: ScenarioFacts,
): string[] =>
  scenarios
    .filter((s) => s !== "ON_TRACK")
    .map((s) => scenarioLine(s, f));

/** Heuristic coach message: primary line, plus a short note on a secondary over-kcal. */
export const coachScenarioMessage = (
  primary: AccountabilityScenario,
  secondary: AccountabilityScenario[],
  f: ScenarioFacts,
): string => {
  const main = scenarioLine(primary, f);
  const alsoOver =
    primary !== "OVER_KCAL" && secondary.includes("OVER_KCAL") && isOverKcal(f)
      ? ` Also over on fuel: ${f.kcalLogged}/${f.kcalTarget} kcal.`
      : "";
  const alsoLift =
    primary !== "MISSED_LIFT" && secondary.includes("MISSED_LIFT")
      ? ` Lift still owed (${f.missedSessions7d} missed this week).`
      : "";
  return `${main}${alsoOver}${alsoLift}`;
};

export const isHarshPick = (
  primary: AccountabilityScenario,
  secondary: AccountabilityScenario[],
): boolean => isHarshScenario(primary) || secondary.some(isHarshScenario);

/** ≤90-char headline for the Today hero. Same numbers as `scenarioLine`. */
export const scenarioHeadline = (s: AccountabilityScenario, f: ScenarioFacts): string => {
  switch (s) {
    case "OVER_KCAL":
      return `Over by ${signedDelta(f.kcalLogged, f.kcalTarget)} kcal (${f.kcalLogged}/${f.kcalTarget}). Next meal: protein, zero extras.`;
    case "UNDER_PROTEIN":
      return `Protein ${Math.round(f.proteinGLogged)}/${Math.round(f.proteinGTarget)}g, ${proteinShortG(f)}g short. Eat lean protein now.`;
    case "MISSED_LIFT":
      return `${f.missedSessions7d} missed in 7 days. Today's session is non-negotiable.`;
    case "UNDER_EATING":
      return `Only ${f.kcalLogged}/${f.kcalTarget} kcal logged. Eat with 40g protein now.`;
    case "STREAK_BREAK":
      return f.priorStreak >= 3
        ? `Your ${f.priorStreak}-day streak ended. Check in now to start the next.`
        : `${f.missedSessions7d} missed sessions in 7 days. Lock the next one.`;
    case "LOW_READINESS":
      return `Low readiness. Go light, but hold protein at ${Math.round(f.proteinGTarget)}g.`;
    case "ON_TRACK":
      return `${f.kcalLogged}/${f.kcalTarget} kcal, ${Math.round(f.proteinGLogged)}/${Math.round(f.proteinGTarget)}g protein. On the number.`;
  }
};
