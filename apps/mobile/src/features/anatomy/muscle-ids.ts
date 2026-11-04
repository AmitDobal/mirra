/**
 * The 18 muscle ids (arch §2). Local union until AMI-161 lands
 * `MuscleIdSchema` in packages/contracts; AMI-168/169 switch to that import.
 */
export const MUSCLE_IDS = [
  "chest",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "traps",
  "lats",
  "upper_back",
  "lower_back",
  "abs",
  "obliques",
  "quads",
  "adductors",
  "hamstrings",
  "glutes",
  "calves",
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: "Chest",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  traps: "Traps",
  lats: "Lats",
  upper_back: "Upper back",
  lower_back: "Lower back",
  abs: "Abs",
  obliques: "Obliques",
  quads: "Quads",
  adductors: "Adductors",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
};
