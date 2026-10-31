import type { AccountabilityScenario, CoachPill } from "@mirra/contracts";

/** Pill ids are a stable contract with the mobile `AiMoodPills` tap handler. */
export const PILL_IDS = {
  fuelCheck: "fuel_check",
  proteinGap: "protein_gap",
  eatUp: "eat_up",
  recalibrate: "recalibrate",
  restart: "restart",
  recover: "recover",
  onTrack: "on_track",
} as const;

const MAX_PILLS = 3;
/** Numeric readiness at or below this reads as "rest". */
const REST_SCORE_MAX = 4;

const SCENARIO_PILL: Record<AccountabilityScenario, CoachPill> = {
  OVER_KCAL: { id: PILL_IDS.fuelCheck, label: "Fuel check", tone: "alert" },
  UNDER_PROTEIN: { id: PILL_IDS.proteinGap, label: "Protein gap", tone: "push" },
  UNDER_EATING: { id: PILL_IDS.eatUp, label: "Eat up", tone: "push" },
  MISSED_LIFT: { id: PILL_IDS.recalibrate, label: "Recalibrate", tone: "push" },
  STREAK_BREAK: { id: PILL_IDS.restart, label: "Restart", tone: "push" },
  LOW_READINESS: { id: PILL_IDS.recover, label: "Recover", tone: "calm" },
  ON_TRACK: { id: PILL_IDS.onTrack, label: "On track", tone: "win" },
};

const RECOVER_PILL = SCENARIO_PILL.LOW_READINESS;
const RECALIBRATE_PILL = SCENARIO_PILL.MISSED_LIFT;

export type CoachPillInput = {
  scenario?: AccountabilityScenario;
  secondary?: readonly AccountabilityScenario[];
  readiness?: number | "push" | "rest";
  status?: string;
};

const isRest = (readiness: CoachPillInput["readiness"]): boolean =>
  readiness === "rest" || (typeof readiness === "number" && readiness <= REST_SCORE_MAX);

/**
 * 1 to 3 deterministic mood/intent pills. No LLM. Order is priority: the primary
 * scenario first, then readiness, then secondary call-outs. Duplicates dropped.
 */
export const deriveCoachPills = (input: CoachPillInput): CoachPill[] => {
  const picked: CoachPill[] = [];
  const add = (pill: CoachPill | undefined): void => {
    if (!pill || picked.some((p) => p.id === pill.id)) return;
    picked.push(pill);
  };

  if (input.scenario) add(SCENARIO_PILL[input.scenario]);
  if (isRest(input.readiness)) add(RECOVER_PILL);
  // A missed check-in (not just a rest-day toggle) calls for a recalibration.
  if (input.status === "skipped" && !isRest(input.readiness)) add(RECALIBRATE_PILL);
  for (const s of input.secondary ?? []) {
    // A win never rides along with a call-out.
    if (s !== "ON_TRACK") add(SCENARIO_PILL[s]);
  }
  if (picked.length === 0 && input.status === "done") add(SCENARIO_PILL.ON_TRACK);

  return picked.slice(0, MAX_PILLS);
};
