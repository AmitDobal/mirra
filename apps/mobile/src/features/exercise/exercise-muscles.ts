/**
 * Which muscles an exercise trains, for the S36 anatomy + muscle bars (AMI-169).
 * Server data (plan `muscles`, strength/library response) wins; the 20-lift
 * catalog labels are only a fallback. Pure: node tests import it directly.
 */
import { MUSCLE_IDS, MUSCLE_LABEL, type MuscleId } from "../anatomy/muscle-ids";
import type { ExerciseMuscle } from "../../lib/api/exercise-library";
import type { CurrentPlan, PlanExercise } from "../../lib/api/types";
import { focusMusclesFor, type FocusMuscle } from "./body-map/catalog-muscles";

export type MuscleBar = { readonly name: string; readonly pct: number };

export type ResolvedMuscles = {
  readonly focus: readonly FocusMuscle[];
  readonly bars: readonly MuscleBar[];
  readonly source: "plan" | "server" | "catalog" | "none";
};

const KNOWN = new Set<string>(MUSCLE_IDS);

/** Valid ids only, one row per id (highest pct), sorted high → low. */
export const cleanMuscles = (muscles: readonly ExerciseMuscle[] | null | undefined): ExerciseMuscle[] => {
  const best = new Map<MuscleId, ExerciseMuscle>();
  for (const m of muscles ?? []) {
    if (!KNOWN.has(m.id) || !(m.pct > 0)) continue;
    const prev = best.get(m.id);
    if (!prev || m.pct > prev.pct) best.set(m.id, m);
  }
  return [...best.values()].sort((a, b) => b.pct - a.pct);
};

const fromServer = (muscles: readonly ExerciseMuscle[]): Pick<ResolvedMuscles, "focus" | "bars"> => ({
  focus: [
    ...muscles.filter((m) => m.role === "primary"),
    ...muscles.filter((m) => m.role !== "primary"),
  ].map((m) => ({ id: m.id, role: m.role === "primary" ? "primary" : "secondary" })),
  bars: muscles.map((m) => ({ name: MUSCLE_LABEL[m.id], pct: Math.round(m.pct) })),
});

type ResolveArgs = {
  /** `PlanExercise.muscles` (AMI-161). */
  readonly plan?: readonly ExerciseMuscle[] | null;
  /** `GET /v1/strength/exercises/:id` or `GET /v1/exercises/:id` muscles. */
  readonly server?: readonly ExerciseMuscle[] | null;
  /** Seeded catalog lift (null for an AI-plan lift we could not match). */
  readonly catalog?: {
    readonly muscle: string;
    readonly muscles: readonly MuscleBar[];
  } | null;
};

/** First non-empty source: plan → server → catalog labels. Empty = hide the section. */
export const resolveMuscles = ({ plan, server, catalog }: ResolveArgs): ResolvedMuscles => {
  const p = cleanMuscles(plan);
  if (p.length) return { ...fromServer(p), source: "plan" };
  const s = cleanMuscles(server);
  if (s.length) return { ...fromServer(s), source: "server" };
  if (catalog && catalog.muscles.length) {
    const focus = focusMusclesFor(catalog.muscles, catalog.muscle);
    if (focus.length) return { focus, bars: catalog.muscles, source: "catalog" };
  }
  return { focus: [], bars: [], source: "none" };
};

/** "Front delts, Triceps" for the legend. */
export const legendNames = (focus: readonly FocusMuscle[], role: FocusMuscle["role"]): string =>
  focus
    .filter((m) => m.role === role)
    .map((m) => MUSCLE_LABEL[m.id])
    .join(", ");

/** Chip label: first primary muscle ("Chest"), null when unknown. */
export const primaryMuscleLabel = (focus: readonly FocusMuscle[]): string | null => {
  const first = focus.find((m) => m.role === "primary") ?? focus[0];
  return first ? MUSCLE_LABEL[first.id] : null;
};

const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The API plan's copy of a local plan lift: same id first, else same name.
 * The SQLite mirror drops `canonicalId` / `muscles`, so screens look them up here.
 */
export const findPlanExercise = (
  plan: CurrentPlan | null | undefined,
  id: string,
  name: string,
): PlanExercise | null => {
  const all = (plan?.days ?? []).flatMap((d) => d.workout?.exercises ?? []);
  const byId = all.find((e) => e.id === id);
  if (byId) return byId;
  const n = normalize(name);
  return (n && all.find((e) => normalize(e.name) === n)) || null;
};
