import type { CoachReviseArea, CoachReviseChange } from "@/lib/api/coach-revise";

export type ProposalRow = {
  readonly key: string;
  readonly before: string | null;
  readonly after: string;
};

export type ProposalSection = {
  readonly area: CoachReviseArea;
  readonly title: string;
  readonly rows: readonly ProposalRow[];
};

const AREA_ORDER: readonly CoachReviseArea[] = ["workout", "meal", "prefs"];

const AREA_TITLE: Record<CoachReviseArea, string> = {
  workout: "WORKOUT REVISION",
  meal: "MEAL ADJUSTMENT",
  prefs: "PLAN PREFERENCES",
};

const MEAL_KINDS = new Set(["cuisine_styles", "diet_tags", "foods_avoid"]);

const areaOf = (change: CoachReviseChange): CoachReviseArea => {
  if (change.area) return change.area;
  if (change.kind.startsWith("workout_")) return "workout";
  if (change.kind.startsWith("meal_") || MEAL_KINDS.has(change.kind)) return "meal";
  return "prefs";
};

const ARROW = " → ";

/** Prefer structured before/after; fall back to "A → B" summaries; else show the summary as the after state. */
const rowOf = (change: CoachReviseChange, index: number): ProposalRow => {
  const key = `${change.kind}-${index}`;
  if (change.before != null && change.after != null) {
    return { key, before: change.before, after: change.after };
  }
  const at = change.summary.indexOf(ARROW);
  if (at > 0) {
    return {
      key,
      before: change.summary.slice(0, at).trim(),
      after: change.summary.slice(at + ARROW.length).trim(),
    };
  }
  return { key, before: null, after: change.summary };
};

/** Group API `changes[]` into Stitch S28 sections (workout / meal / prefs) of before → after rows. */
export const buildProposalSections = (
  changes: readonly CoachReviseChange[],
): readonly ProposalSection[] => {
  const byArea = new Map<CoachReviseArea, ProposalRow[]>();
  changes.forEach((change, index) => {
    const area = areaOf(change);
    byArea.set(area, [...(byArea.get(area) ?? []), rowOf(change, index)]);
  });
  return AREA_ORDER.flatMap((area) => {
    const rows = byArea.get(area);
    return rows ? [{ area, title: AREA_TITLE[area], rows }] : [];
  });
};

/** API prefixes dry-run replies with "Preview: " — the card already says it's a proposal. */
export const stripPreviewPrefix = (message: string): string => message.replace(/^Preview:\s*/i, "");
