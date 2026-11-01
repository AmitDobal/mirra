import type { ImageSourcePropType } from "react-native";

import { s12WeekReveal, s15Today } from "../../../assets/stitch";

const POOL: readonly ImageSourcePropType[] = [
  s12WeekReveal.dumbbellOverheadPress,
  s12WeekReveal.barbellBentOverRow,
  s12WeekReveal.barbellBackSquat,
  s15Today.trainerSquat,
];

/** Pick a Stitch thumbnail by movement keyword, falling back to a stable cycle by row index. */
export const exercisePhoto = (name: string, index: number): ImageSourcePropType => {
  const n = name.toLowerCase();
  if (/press|push|fly|raise/.test(n)) return POOL[0]!;
  if (/row|pull|curl|lat/.test(n)) return POOL[1]!;
  if (/squat|lunge|deadlift|leg|hip/.test(n)) return POOL[2]!;
  return POOL[index % POOL.length]!;
};
