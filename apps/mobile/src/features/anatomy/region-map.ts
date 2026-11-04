/**
 * Vendor slug → our muscle ids, per view (arch §2.1). Several muscles may share
 * one drawn region. Slugs not listed (head, hair, neck, hands, feet, knees,
 * ankles) are drawn passive and are not pressable.
 */
import type { MuscleId } from "./muscle-ids";
import type { AnatomySide, VendorSlug } from "./paths";

type SlugMap = Partial<Record<VendorSlug, readonly MuscleId[]>>;

const FRONT: SlugMap = {
  chest: ["chest"],
  biceps: ["biceps"],
  forearm: ["forearms"],
  abs: ["abs"],
  obliques: ["obliques"],
  deltoids: ["front_delts", "side_delts"],
  trapezius: ["traps"],
  triceps: ["triceps"],
  quadriceps: ["quads"],
  adductors: ["adductors"],
  calves: ["calves"],
  tibialis: ["calves"],
};

const BACK: SlugMap = {
  trapezius: ["traps"],
  deltoids: ["rear_delts"],
  triceps: ["triceps"],
  forearm: ["forearms"],
  "upper-back": ["lats", "upper_back"],
  "lower-back": ["lower_back"],
  gluteal: ["glutes"],
  hamstring: ["hamstrings"],
  adductors: ["adductors"],
  calves: ["calves"],
};

const MAPS: Record<AnatomySide, SlugMap> = { front: FRONT, back: BACK };

const NONE: readonly MuscleId[] = [];

export const musclesForSlug = (side: AnatomySide, slug: VendorSlug): readonly MuscleId[] =>
  MAPS[side][slug] ?? NONE;

/** Slugs on a side that draw the given muscle (for tests and focus checks). */
export const slugsForMuscle = (side: AnatomySide, id: MuscleId): VendorSlug[] =>
  (Object.keys(MAPS[side]) as VendorSlug[]).filter((s) => musclesForSlug(side, s).includes(id));
