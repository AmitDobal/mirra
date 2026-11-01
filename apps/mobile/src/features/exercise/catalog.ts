import type { ImageSourcePropType } from "react-native";

import {
  s25ExerciseHub,
  s26ExerciseDetail,
  s27ExerciseSwapAdd,
} from "../../../assets/stitch";
import raw from "@/content/exercise-catalog.json";
import type { EquipmentId } from "@/features/onboarding/types";
import type { PlanExercise } from "@/lib/api";

export type CatalogPattern = "push" | "pull" | "legs" | "core";
export type CatalogEquipment = "Barbell" | "Dumbbells" | "Cables" | "Machine" | "Bodyweight";

type ThumbKey =
  | "hero"
  | "bench"
  | "row"
  | "rdl"
  | "ohp"
  | "pushdown"
  | "dbPress"
  | "machinePress"
  | "pushup"
  | "cableFly"
  | "inclineDb";

export type CatalogStep = { readonly title: string; readonly body: string };

export type CatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly pattern: CatalogPattern;
  readonly muscle: string;
  readonly equipment: CatalogEquipment;
  readonly level: string;
  readonly kind: string;
  readonly sets: number;
  readonly reps: string;
  readonly restSec: number;
  readonly thumb: ThumbKey;
  readonly cue: string;
  /** One-line reason shown when this lift is offered as a swap. */
  readonly why: string;
  readonly muscles: readonly { readonly name: string; readonly pct: number }[];
  readonly steps: readonly CatalogStep[];
};

type RawEntry = Omit<CatalogEntry, "muscles" | "steps"> & {
  readonly muscles: readonly (readonly [string, number])[];
  readonly steps: readonly (readonly [string, string])[];
};

export const EXERCISE_CATALOG: readonly CatalogEntry[] = (raw as unknown as RawEntry[]).map(
  (e) => ({
    ...e,
    muscles: e.muscles.map(([name, pct]) => ({ name, pct })),
    steps: e.steps.map(([title, body]) => ({ title, body })),
  }),
);

const THUMBS: Record<ThumbKey, ImageSourcePropType> = {
  hero: s26ExerciseDetail.hero,
  bench: s25ExerciseHub.bench,
  row: s25ExerciseHub.row,
  rdl: s25ExerciseHub.rdl,
  ohp: s25ExerciseHub.ohp,
  pushdown: s25ExerciseHub.pushdown,
  dbPress: s27ExerciseSwapAdd.dbPress,
  machinePress: s27ExerciseSwapAdd.machinePress,
  pushup: s27ExerciseSwapAdd.pushup,
  cableFly: s27ExerciseSwapAdd.cableFly,
  inclineDb: s27ExerciseSwapAdd.inclineDb,
};

export const thumbSource = (key: ThumbKey): ImageSourcePropType => THUMBS[key];

/** Wide detail hero: the S26 Stitch shot for the bench press, else the lift thumb. */
export const heroSource = (e: CatalogEntry): ImageSourcePropType =>
  e.id === "barbell-bench-press" || e.thumb === "hero"
    ? s26ExerciseDetail.hero
    : THUMBS[e.thumb];

export const PATTERN_LABEL: Record<CatalogPattern, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
};

export const EQUIPMENT_FILTERS: readonly CatalogEquipment[] = [
  "Barbell",
  "Dumbbells",
  "Cables",
  "Machine",
  "Bodyweight",
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const findCatalogById = (id: string): CatalogEntry | undefined =>
  EXERCISE_CATALOG.find((e) => e.id === id);

/** Match a plan exercise name to a catalog lift (exact, then contains either way). */
export const findCatalogByName = (name: string): CatalogEntry | undefined => {
  const n = normalize(name);
  if (!n) return undefined;
  return (
    EXERCISE_CATALOG.find((e) => normalize(e.name) === n) ??
    EXERCISE_CATALOG.find((e) => {
      const c = normalize(e.name);
      return c.includes(n) || n.includes(c);
    })
  );
};

const GENERIC_STEPS: readonly CatalogStep[] = [
  { title: "Set Up", body: "Pick a load you can control and set your stance or seat before the first rep." },
  { title: "Brace", body: "Take a breath, brace your core, and keep your spine neutral." },
  { title: "Move With Control", body: "Lower for 2–3 seconds, pause briefly, then drive back up smoothly." },
];

const patternFromName = (name: string): CatalogPattern => {
  const n = normalize(name);
  if (/(row|pull|curl|lat|face)/.test(n)) return "pull";
  if (/(squat|deadlift|lunge|leg|calf|thrust|glute)/.test(n)) return "legs";
  if (/(plank|crunch|core|ab )/.test(n)) return "core";
  return "push";
};

/** Catalog entry for a plan lift; builds a generic one when the name is not seeded. */
export const entryForPlanExercise = (ex: PlanExercise): CatalogEntry => {
  const match = findCatalogByName(ex.name);
  if (match) return match;
  return {
    id: ex.id,
    name: ex.name,
    pattern: patternFromName(ex.name),
    muscle: "Full body",
    equipment: "Bodyweight",
    level: "Custom",
    kind: "Custom",
    sets: ex.targetSets,
    reps: ex.targetReps,
    restSec: ex.restSec ?? 90,
    thumb: "hero",
    cue: ex.cue ?? "Move with control and keep your core braced.",
    why: "Your own lift.",
    muscles: [],
    steps: GENERIC_STEPS,
  };
};

type FilterArgs = {
  readonly pattern?: CatalogPattern | null;
  readonly equipment?: CatalogEquipment | null;
  readonly query?: string;
};

export const filterCatalog = ({ pattern, equipment, query }: FilterArgs): CatalogEntry[] => {
  const q = normalize(query ?? "");
  return EXERCISE_CATALOG.filter((e) => {
    if (pattern && e.pattern !== pattern) return false;
    if (equipment && e.equipment !== equipment) return false;
    if (!q) return true;
    return [e.name, e.muscle, e.equipment, PATTERN_LABEL[e.pattern]].some((f) =>
      normalize(f).includes(q),
    );
  });
};

/** Onboarding equipment ids → catalog equipment the user can train with. */
export const availableEquipment = (ids: readonly EquipmentId[]): Set<CatalogEquipment> => {
  const out = new Set<CatalogEquipment>(["Bodyweight"]);
  if (ids.includes("full_gym")) EQUIPMENT_FILTERS.forEach((e) => out.add(e));
  if (ids.includes("dumbbells")) out.add("Dumbbells");
  if (ids.includes("barbell")) out.add("Barbell");
  if (ids.includes("machines")) out.add("Machine");
  if (ids.includes("cables")) out.add("Cables");
  return out;
};

type AltArgs = {
  readonly target: CatalogEntry;
  readonly available: ReadonlySet<CatalogEquipment>;
  /** Names already in today's session (never suggested). */
  readonly exclude: readonly string[];
  readonly query?: string;
  readonly limit?: number;
};

/** Equipment-aware swaps: same movement pattern, same muscle first, owned gear first. */
export const suggestAlternatives = ({
  target,
  available,
  exclude,
  query,
  limit = 3,
}: AltArgs): CatalogEntry[] => {
  const taken = new Set(exclude.map(normalize));
  const score = (e: CatalogEntry) =>
    (e.muscle === target.muscle ? 3 : 0) +
    (available.has(e.equipment) ? 2 : 0) +
    (e.kind === target.kind ? 1 : 0) +
    (e.equipment !== target.equipment ? 0.5 : 0);
  const pool = query?.trim()
    ? filterCatalog({ query })
    : EXERCISE_CATALOG.filter((e) => e.pattern === target.pattern);
  return pool
    .filter((e) => e.id !== target.id && !taken.has(normalize(e.name)))
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
};

export const prescription = (e: CatalogEntry) => `${e.sets} × ${e.reps}`;
