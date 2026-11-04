/**
 * Session → exercise score (research §2.4 step 3, arch §6.2). Pure.
 * EWMA per session (not per day, so rest never decays), floor at 85% of the best
 * session, promote at once, demote one step only after 2 straight sessions below
 * the displayed step's floor minus 2 pct.
 */
import { DEMOTE_BUFFER, stepLowerPct, stepOfPct } from "./tiers";

export const EWMA_ALPHA = 0.3;
export const FLOOR_SHARE = 0.85;
export const DEMOTE_AFTER = 2;

export type ExerciseScoreState = {
  sustainedPct: number;
  bestPct: number;
  lastSessionPct: number;
  sessions: number;
  displayStep: number;
  belowCount: number;
};

/** Score shown for an exercise: sustained, never below 85% of the best session. */
export const exercisePctOf = (s: Pick<ExerciseScoreState, "sustainedPct" | "bestPct">): number =>
  Math.max(s.sustainedPct, FLOOR_SHARE * s.bestPct);

export const nextExerciseScore = (
  prev: ExerciseScoreState | null,
  sessionPct: number,
): ExerciseScoreState => {
  if (!prev) {
    return {
      sustainedPct: sessionPct,
      bestPct: sessionPct,
      lastSessionPct: sessionPct,
      sessions: 1,
      displayStep: stepOfPct(sessionPct),
      belowCount: 0,
    };
  }
  const sustainedPct = EWMA_ALPHA * sessionPct + (1 - EWMA_ALPHA) * prev.sustainedPct;
  const bestPct = Math.max(prev.bestPct, sessionPct);
  const pct = exercisePctOf({ sustainedPct, bestPct });
  const raw = stepOfPct(pct);

  let displayStep = prev.displayStep;
  let belowCount = 0;
  if (raw > prev.displayStep) {
    displayStep = raw;
  } else if (pct < stepLowerPct(prev.displayStep) - DEMOTE_BUFFER) {
    belowCount = prev.belowCount + 1;
    if (belowCount >= DEMOTE_AFTER) {
      displayStep = Math.max(raw, prev.displayStep - 1);
      belowCount = 0;
    }
  }
  return { sustainedPct, bestPct, lastSessionPct: sessionPct, sessions: prev.sessions + 1, displayStep, belowCount };
};
