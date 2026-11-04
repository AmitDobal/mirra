/**
 * Strength Tier ladder (arch §1). 22 steps: Iron..Elite have divisions III → II → I,
 * Legendary has none. Pure; no D1.
 */
import { TIER_IDS, TIER_MAX_STEP, type TierId, type TierStanding } from "@mirra/contracts";

/** Lower percentile bound of each step (index = step). */
export const STEP_LOWER_PCT: readonly number[] = [
  0, 3, 6, // Iron III / II / I
  10, 15, 20, // Bronze
  25, 30, 35, // Silver
  40, 45, 50, // Gold
  55, 60, 65, // Platinum
  70, 75, 80, // Diamond
  85, 89, 93, // Elite
  97, // Legendary
];

export const MAX_STEP = TIER_MAX_STEP;

/** Pct points below a step's floor before a session counts toward demotion. */
export const DEMOTE_BUFFER = 2;

const clampStep = (step: number): number => Math.max(0, Math.min(MAX_STEP, Math.trunc(step)));

export const stepOfPct = (pct: number): number => {
  let step = 0;
  for (let i = 0; i < STEP_LOWER_PCT.length; i += 1) if (pct >= STEP_LOWER_PCT[i]!) step = i;
  return step;
};

export const stepLowerPct = (step: number): number => STEP_LOWER_PCT[clampStep(step)]!;

export const tierOfStep = (step: number): { tier: TierId; division: 1 | 2 | 3 | null } => {
  const s = clampStep(step);
  if (s === MAX_STEP) return { tier: "legendary", division: null };
  return { tier: TIER_IDS[Math.floor(s / 3)]!, division: (3 - (s % 3)) as 1 | 2 | 3 };
};

const ROMAN = { 1: "I", 2: "II", 3: "III" } as const;

export const label = (step: number): string => {
  const { tier, division } = tierOfStep(step);
  const name = tier.charAt(0).toUpperCase() + tier.slice(1);
  return division == null ? name : `${name} ${ROMAN[division]}`;
};

/**
 * Hysteresis for derived scores (muscle / group / overall): promote at once, keep the
 * previous step while pct stays within DEMOTE_BUFFER of its floor.
 */
export const holdStep = (prevStep: number | null, pct: number): number => {
  const raw = stepOfPct(pct);
  if (prevStep == null || raw >= prevStep) return raw;
  return pct >= stepLowerPct(prevStep) - DEMOTE_BUFFER ? prevStep : raw;
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Wire standing for a displayed step. Progress is measured inside the displayed step. */
export const standingOf = (step: number, pct: number): TierStanding => {
  const s = clampStep(step);
  const { tier, division } = tierOfStep(s);
  let progressToNext: number | null = null;
  if (s < MAX_STEP) {
    const lo = stepLowerPct(s);
    const hi = stepLowerPct(s + 1);
    progressToNext = Math.round(Math.max(0, Math.min(1, (pct - lo) / (hi - lo))) * 100) / 100;
  }
  return { step: s, tier, division, label: label(s), pct: round1(pct), progressToNext };
};
