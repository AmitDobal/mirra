/**
 * Strength tier ladder (arch doc strength-tiers-and-chat-diff.md §1).
 * 22 steps, 0..21. Divisions run III → II → I. Legendary (step 21) has no division.
 */
import { color } from "../../theme/tokens";

export const TIER_IDS = [
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "elite",
  "legendary",
] as const;

export type TierId = (typeof TIER_IDS)[number];
export type Division = "III" | "II" | "I";

export const DIVISIONS: readonly Division[] = ["III", "II", "I"];
export const MAX_STEP = 21;
export const STEP_COUNT = MAX_STEP + 1;

export const TIER_LABEL: Record<TierId, string> = {
  iron: "Iron",
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
  elite: "Elite",
  legendary: "Legendary",
};

export type TierPlace = { readonly tier: TierId; readonly division: Division | null };

const clampStep = (step: number): number =>
  Math.min(MAX_STEP, Math.max(0, Math.floor(Number.isFinite(step) ? step : 0)));

/** Step 0..21 → tier + division. Out-of-range steps clamp. */
export const tierOfStep = (step: number): TierPlace => {
  const s = clampStep(step);
  if (s === MAX_STEP) return { tier: "legendary", division: null };
  const tier = TIER_IDS[Math.floor(s / 3)] ?? "iron";
  return { tier, division: DIVISIONS[s % 3] ?? "III" };
};

/** Inverse of tierOfStep. Legendary ignores division. */
export const stepOf = (tier: TierId, division: Division | null): number => {
  if (tier === "legendary") return MAX_STEP;
  return TIER_IDS.indexOf(tier) * 3 + DIVISIONS.indexOf(division ?? "III");
};

/** "Gold II", "Legendary". */
export const labelOf = ({ tier, division }: TierPlace): string =>
  division ? `${TIER_LABEL[tier]} ${division}` : TIER_LABEL[tier];

export const labelOfStep = (step: number): string => labelOf(tierOfStep(step));

/** Pips under a badge: III = 1, II = 2, I = 3, Legendary = 0. */
export const pipCount = (division: Division | null): number =>
  division ? DIVISIONS.indexOf(division) + 1 : 0;

export type TierPalette = { readonly fill: string; readonly bevel: string };

export const TIER_PALETTE: Record<TierId, TierPalette> = {
  iron: { fill: color.tier.iron, bevel: color.tier.ironBevel },
  bronze: { fill: color.tier.bronze, bevel: color.tier.bronzeBevel },
  silver: { fill: color.tier.silver, bevel: color.tier.silverBevel },
  gold: { fill: color.tier.gold, bevel: color.tier.goldBevel },
  platinum: { fill: color.tier.platinum, bevel: color.tier.platinumBevel },
  diamond: { fill: color.tier.diamond, bevel: color.tier.diamondBevel },
  elite: { fill: color.tier.elite, bevel: color.tier.eliteBevel },
  legendary: { fill: color.tier.legendary, bevel: color.tier.legendaryBevel },
};

export const tierColor = (tier: TierId): string => TIER_PALETTE[tier].fill;
