import type { planChatCopy } from "@/content/plan-chat";
import type {
  CoachReviseChange,
  ExerciseSnap,
  MacroDelta,
  MealSnap,
  ReviseItem,
} from "@/lib/api/coach-revise";

/** Pure view model for the S39 proposal card (no RN imports, so `node --test` can load it). */

export type ProposalLabels = typeof planChatCopy;

export type ProposalArea = "workout" | "meal" | "schedule" | "prefs";

/** One diff block. Text is final copy: "Before: Lunch · Chicken Caesar wrap". */
export type DiffRowModel =
  | {
      readonly key: string;
      readonly variant: "swap";
      readonly before: string;
      readonly beforePill: string | null;
      readonly after: string;
      readonly tags: readonly string[];
      readonly reason: string | null;
    }
  | {
      readonly key: string;
      readonly variant: "add";
      readonly after: string;
      readonly tags: readonly string[];
      readonly reason: string | null;
    }
  | {
      readonly key: string;
      readonly variant: "remove";
      readonly before: string;
      readonly beforePill: string | null;
      readonly reason: string | null;
    }
  | { readonly key: string; readonly variant: "single"; readonly text: string; readonly tags: readonly string[] };

export type ProposalSection = {
  readonly area: ProposalArea;
  readonly title: string;
  /** Workout day under the section title ("Thu · Push day"). */
  readonly subtitle: string | null;
  readonly rows: readonly DiffRowModel[];
};

/** S39 order. */
const AREA_ORDER: readonly ProposalArea[] = ["workout", "meal", "schedule", "prefs"];

const MINUS = "−";
const kcal = (n: number): string => `${Math.round(n)} kcal`;
const signed = (n: number, unit: string): string => `${n < 0 ? MINUS : "+"}${Math.abs(Math.round(n))}${unit}`;
const exercise = (e: ExerciseSnap): string => `${e.name} · ${e.sets}×${e.reps}`;

/** Fallback when the server sent no reason: "+12g protein · −20g carbs · 610 kcal". */
export const mealDeltaReason = (delta: MacroDelta, after: MealSnap): string => {
  const moves = (
    [
      ["protein", delta.proteinG],
      ["carbs", delta.carbsG],
      ["fat", delta.fatG],
    ] as const
  )
    .filter(([, g]) => Math.abs(g) >= 3)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 2)
    .map(([name, g]) => `${signed(g, "g")} ${name}`);
  return [...moves, kcal(after.kcal)].join(" · ");
};

const areaOfItem = (item: ReviseItem): ProposalArea => {
  switch (item.kind) {
    case "meal_swap":
    case "meal_add":
    case "meal_remove":
    case "meals_per_day":
      return "meal";
    case "schedule_day_move":
      return "schedule";
    case "pref":
      return "prefs";
    default:
      return "workout";
  }
};

/** Map one typed v2 item to its S39 diff block. */
export const rowOfItem = (item: ReviseItem, l: ProposalLabels): DiffRowModel => {
  const { row } = l;
  const key = item.id;
  const tags = item.tags.slice(0, 2);
  switch (item.kind) {
    case "meal_swap": {
      const slot = l.slot[item.slot];
      return {
        key,
        variant: "swap",
        before: `${row.before}${slot} · ${item.before.name}`,
        beforePill: kcal(item.before.kcal),
        after: `${row.after}${slot} · ${item.after.name}`,
        tags,
        reason: item.reason ?? mealDeltaReason(item.delta, item.after),
      };
    }
    case "meal_add":
      return {
        key,
        variant: "add",
        after: `${row.add}${l.slot[item.slot]} · ${item.after.name}`,
        tags,
        reason: item.reason ?? `${kcal(item.after.kcal)} · ${Math.round(item.after.proteinG)}g protein`,
      };
    case "meal_remove":
      return {
        key,
        variant: "remove",
        before: `${row.remove}${l.slot[item.slot]} · ${item.before.name}`,
        beforePill: kcal(item.before.kcal),
        reason: item.reason,
      };
    case "exercise_swap":
      return {
        key,
        variant: "swap",
        before: `${row.before}${exercise(item.before)}`,
        beforePill: null,
        after: `${row.after}${exercise(item.after)}`,
        tags,
        reason: item.reason,
      };
    case "exercise_add":
      return { key, variant: "add", after: `${row.add}${exercise(item.after)}`, tags, reason: item.reason };
    case "exercise_remove":
      return { key, variant: "remove", before: `${row.remove}${exercise(item.before)}`, beforePill: null, reason: item.reason };
    case "session_minutes":
      return {
        key,
        variant: "swap",
        before: `${row.before}${row.session} · ${item.before} min`,
        beforePill: null,
        after: `${row.after}${row.session} · ${item.after} min`,
        tags,
        reason: item.reason ?? (item.droppedExercises.length > 0 ? `Drops ${item.droppedExercises.join(", ")}` : null),
      };
    case "meals_per_day":
      return {
        key,
        variant: "swap",
        before: `${row.before}${row.mealsPerDay(item.before)}`,
        beforePill: null,
        after: `${row.after}${row.mealsPerDay(item.after)}`,
        tags,
        reason: item.reason,
      };
    case "schedule_day_move":
      return {
        key,
        variant: "swap",
        before: `${row.before}${item.fromLabel} · ${item.title}`,
        beforePill: null,
        after: `${row.after}${item.toLabel} · ${item.title}`,
        tags,
        reason: item.reason,
      };
    case "pref":
      return { key, variant: "single", text: `${item.label}: ${item.items.join(", ")}`, tags };
  }
};

const workoutSubtitle = (items: readonly ReviseItem[]): string | null => {
  const days = [
    ...new Set(items.flatMap((i) => ("dayLabel" in i && i.dayLabel ? [i.dayLabel] : []))),
  ];
  return days.length > 0 ? days.join(" / ") : null;
};

/** Group v2 `items` into S39 sections: WORKOUT REVISION, MEAL ADJUSTMENT, SCHEDULE, PLAN PREFERENCES. */
export const buildSectionsFromItems = (
  items: readonly ReviseItem[],
  l: ProposalLabels,
): readonly ProposalSection[] =>
  AREA_ORDER.flatMap((area) => {
    const inArea = items.filter((i) => areaOfItem(i) === area);
    if (inArea.length === 0) return [];
    return [
      {
        area,
        title: l.sections[area],
        subtitle: area === "workout" ? workoutSubtitle(inArea) : null,
        rows: inArea.map((i) => rowOfItem(i, l)),
      },
    ];
  });

// ── Legacy `changes[]` (pre-v2 API): string before/after. ───────────────────────────

const LEGACY_MEAL_KINDS = new Set(["cuisine_styles", "diet_tags", "foods_avoid"]);
const ARROW = " → ";

const legacyArea = (c: CoachReviseChange): ProposalArea => {
  if (c.kind.startsWith("schedule")) return "schedule";
  if (c.area) return c.area;
  if (c.kind.startsWith("workout_")) return "workout";
  if (c.kind.startsWith("meal_") || LEGACY_MEAL_KINDS.has(c.kind)) return "meal";
  return "prefs";
};

const legacyRow = (c: CoachReviseChange, index: number, l: ProposalLabels): DiffRowModel => {
  const key = `${c.kind}-${index}`;
  const swap = (before: string, after: string): DiffRowModel => ({
    key,
    variant: "swap",
    before: `${l.row.before}${before}`,
    beforePill: null,
    after: `${l.row.after}${after}`,
    tags: [],
    reason: null,
  });
  if (c.before != null && c.after != null) return swap(c.before, c.after);
  const at = c.summary.indexOf(ARROW);
  if (at > 0) return swap(c.summary.slice(0, at).trim(), c.summary.slice(at + ARROW.length).trim());
  return { key, variant: "single", text: c.summary, tags: [] };
};

/** Older API without `items`: group string changes into the same sections. */
export const buildSectionsFromChanges = (
  changes: readonly CoachReviseChange[],
  l: ProposalLabels,
): readonly ProposalSection[] => {
  const byArea = new Map<ProposalArea, DiffRowModel[]>();
  changes.forEach((c, i) => {
    const area = legacyArea(c);
    byArea.set(area, [...(byArea.get(area) ?? []), legacyRow(c, i, l)]);
  });
  return AREA_ORDER.flatMap((area) => {
    const rows = byArea.get(area);
    return rows ? [{ area, title: l.sections[area], subtitle: null, rows }] : [];
  });
};

/** v2 items win; fall back to legacy `changes` when the API sent none. */
export const buildProposalSections = (
  input: { readonly items?: readonly ReviseItem[] | null; readonly changes: readonly CoachReviseChange[] },
  l: ProposalLabels,
): readonly ProposalSection[] =>
  input.items && input.items.length > 0
    ? buildSectionsFromItems(input.items, l)
    : buildSectionsFromChanges(input.changes, l);

/** API prefixes dry-run replies with "Preview: "; the card already says it's a proposal. */
export const stripPreviewPrefix = (message: string): string => message.replace(/^Preview:\s*/i, "");

/**
 * Coach line above a pending proposal: always the S39 conditional copy, so a preview never
 * reads "Done" (older APIs sent the reviser's "Done, …" reply). Plain replies pass through.
 */
export const previewReplyText = (message: string, proposes: boolean, previewCopy: string): string =>
  proposes ? previewCopy : stripPreviewPrefix(message);

/** AMI-181 `goalImpact` → the line under "Apply these to your plan?"; null / blank renders nothing. */
export const goalImpactLine = (impact: { readonly line: string } | null | undefined): string | null => {
  const line = impact?.line?.trim() ?? "";
  return line.length > 0 ? line : null;
};
