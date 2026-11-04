/**
 * Today hero (S15c) sizing. Beside the photo, the action row gets
 * `windowWidth - HERO_CHROME` points (screen + card padding, photo, gap). Start Workout + Swap
 * need ~208pt; below that (iPhone SE 375, 320 widths) the actions drop under the title row
 * at full card width so "Start Workout" never clips.
 */
export const HERO_ACTIONS_MIN = 208;
const SCREEN_AND_CARD_PAD = 40 + 32;
const GAP = 16;

export type HeroLayout = {
  readonly compact: boolean;
  readonly photoW: number;
  readonly photoH: number;
};

export const heroLayout = (windowWidth: number): HeroLayout => {
  const besidePhoto = windowWidth - SCREEN_AND_CARD_PAD - 104 - GAP;
  if (besidePhoto >= HERO_ACTIONS_MIN) return { compact: false, photoW: 104, photoH: 132 };
  return { compact: true, photoW: 88, photoH: 112 };
};
