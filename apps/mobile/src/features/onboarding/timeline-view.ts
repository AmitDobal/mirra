/**
 * S43 "Your timeline" view model (AMI-180). Pure: engine projection + answers → strings.
 * Copy: `content/goal.ts`. Arch: `docs/03-engineering/goal-timeline.md` §7.
 */
import type { GoalProjection } from "@mirra/contracts";

type GoalMilestone = GoalProjection["milestones"][number];

import { goalCopy } from "@/content/goal";
import type { GoalChartData } from "@/features/goal/chart/goal-chart-model";
import {
  dateRange,
  ratePerWeek,
  shortDate,
  weightNumber,
  weightPair,
  weightText,
  weeksApprox,
  type WeightUnit,
} from "@/features/goal/goal-format";

import { timelineKind, type TimelineKind } from "./goal-preview";

const c = goalCopy.onboarding;
const HORIZON_WEEK = 12;
const MAX_ROWS = 4;

export type TimelineContext = {
  readonly unit: WeightUnit;
  readonly goalLabel: string;
  readonly paceLabel: string;
  readonly experienceLabel: string;
  readonly sessions: number;
  readonly sessionMinutes: number;
  /** Generated plan summary (preferred) → engine kcal hint fallback. */
  readonly kcal: number | null;
  readonly proteinG: number | null;
};

export type TimelineRow = { readonly label: string; readonly value: string };
export type TimelineMilestoneRow = {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly date: string | null;
  readonly final: boolean;
};

export type TimelineView = {
  readonly kind: TimelineKind;
  readonly headline: string;
  readonly sub: string;
  readonly paceLine: string;
  readonly stats: readonly TimelineRow[];
  readonly chart: { readonly data: GoalChartData; readonly etaWeeks: number | null; readonly a11y: string } | null;
  readonly milestones: readonly TimelineMilestoneRow[];
  readonly picked: readonly TimelineRow[];
  readonly whatIf: string | null;
  readonly commitLine: string;
};

const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const round50 = (n: number) => Math.round(n / 50) * 50;

const flagNotes = (p: GoalProjection, unit: WeightUnit): string[] =>
  p.flags.flatMap((f) => {
    if (f === "direction_mismatch") return [c.flags.direction_mismatch(p.direction === "down")];
    if (f === "target_below_healthy" && p.targetEffectiveKg !== null) {
      return [c.flags.target_below_healthy(weightText(p.targetEffectiveKg, unit))];
    }
    if (f === "minor_pace" || f === "kcal_floor" || f === "beyond_horizon") return [c.flags[f]];
    return [];
  });

const milestoneRow = (m: GoalMilestone): TimelineMilestoneRow => {
  if (m.id === "first_change") {
    return { id: m.id, title: c.firstChange, detail: m.detail ? c.firstChangeDetail(m.detail) : null, date: m.date ? shortDate(m.date) : null, final: false };
  }
  const [title, ...rest] = m.label.split(" · ");
  const detail = [rest.join(" · "), m.detail ?? ""].filter(Boolean).join(" · ") || null;
  return { id: m.id, title: title ?? m.label, detail, date: m.date ? shortDate(m.date) : null, final: m.id === "goal" };
};

/** Stitch S43 shows three rows; the 5 % row is dropped when halfway already covers it. */
export const timelineMilestones = (ms: readonly GoalMilestone[]): TimelineMilestoneRow[] => {
  const hasHalfway = ms.some((m) => m.id === "halfway");
  return ms.filter((m) => !(m.id === "pct5" && hasHalfway)).slice(0, MAX_ROWS).map(milestoneRow);
};

const chartFor = (p: GoalProjection, kind: TimelineKind, unit: WeightUnit): TimelineView["chart"] => {
  if (!p.chart || p.startWeightKg === null) return null;
  const cut = (s: readonly number[]) => (kind === "eta" ? [...s] : s.slice(0, HORIZON_WEEK + 1));
  const data: GoalChartData = {
    ...p.chart,
    unit,
    targetKg: kind === "eta" ? p.targetEffectiveKg : null,
    planned: cut(p.chart.planned),
    optimistic: cut(p.chart.optimistic),
    conservative: cut(p.chart.conservative),
  };
  const end = kind === "eta" && p.targetEffectiveKg !== null ? weightText(p.targetEffectiveKg, unit) : weightText(p.startWeightKg, unit);
  const date = kind === "eta" && p.band.expected ? shortDate(p.band.expected) : null;
  return { data, etaWeeks: kind === "eta" ? p.band.weeksExpected : null, a11y: goalCopy.chart.a11y(weightText(p.startWeightKg, unit), end, date) };
};

const statsFor = (p: GoalProjection, kind: TimelineKind, unit: WeightUnit, nextDate: string | null): TimelineRow[] => {
  const s = c.stats;
  if (kind === "eta") {
    return [
      { label: s.expected, value: shortDate(p.band.expected!) },
      { label: s.range, value: dateRange(p.band.optimistic ?? p.band.expected!, p.band.conservative ?? p.band.expected!) },
      { label: s.weeks, value: weeksApprox(p.band.weeksExpected ?? 0) },
    ];
  }
  const ch = p.chart;
  const at = (arr: readonly number[] | undefined, i: number) => arr?.[Math.min(i, arr.length - 1)] ?? p.startWeightKg ?? 0;
  if (kind === "horizon") {
    const a = at(ch?.optimistic, HORIZON_WEEK);
    const b = at(ch?.conservative, HORIZON_WEEK);
    return [
      { label: s.inTwelve, value: `~${weightText(at(ch?.planned, HORIZON_WEEK), unit)}` },
      { label: s.range, value: `${weightNumber(Math.min(a, b), unit)}–${weightNumber(Math.max(a, b), unit)} ${unit}` },
      { label: s.weeks, value: String(HORIZON_WEEK) },
    ];
  }
  const hi = at(ch?.optimistic, 0);
  const lo = at(ch?.conservative, 0);
  return [
    { label: c.holdLine, value: weightText(p.startWeightKg ?? 0, unit) },
    { label: s.band, value: `${weightNumber(Math.min(lo, hi), unit)}–${weightNumber(Math.max(lo, hi), unit)} ${unit}` },
    { label: s.next, value: nextDate ?? "—" },
  ];
};

export const buildTimelineView = (p: GoalProjection, ctx: TimelineContext): TimelineView => {
  const kind = timelineKind(p);
  const { unit } = ctx;
  const start = p.startWeightKg ?? 0;
  const target = p.targetEffectiveKg;
  const rate = kind === "hold" ? null : ratePerWeek(p.paceRateKg, unit);
  const headline =
    kind === "eta" && target !== null
      ? c.headlineEta(weightPair(start, target, unit), shortDate(p.band.expected!))
      : kind === "horizon"
        ? c.headlineHorizon(weightText(start, unit))
        : c.headlineHold(ctx.goalLabel, weightText(start, unit));
  const baseSub = kind === "eta" ? c.subEta : kind === "horizon" ? c.subHorizon : c.subHold;
  const milestones = timelineMilestones(p.milestones);
  const kcal = ctx.kcal ?? (p.kcalHint !== null ? round50(p.kcalHint) : null);
  const weightValue =
    target !== null && Math.abs(target - start) >= 0.05 ? weightPair(start, target, unit) : weightText(start, unit);

  const picked: TimelineRow[] = [
    { label: c.picked.goal, value: ctx.goalLabel },
    { label: c.picked.weight, value: p.targetWeightKg === null ? `${weightText(start, unit)} · ${c.noGoalWeight}` : weightValue },
    { label: c.picked.pace, value: rate ? c.paceLine(ctx.paceLabel, rate) : ctx.paceLabel },
    { label: c.picked.training, value: c.trainingValue(ctx.sessions, ctx.sessionMinutes) },
    { label: c.picked.experience, value: ctx.experienceLabel },
  ];
  if (kcal !== null) picked.push({ label: c.picked.fuel, value: c.fuelValue(thousands(kcal), ctx.proteinG) });

  return {
    kind,
    headline,
    sub: [baseSub, ...flagNotes(p, unit)].join(" "),
    paceLine: rate ? c.paceLine(ctx.paceLabel, rate) : c.holdLine,
    stats: statsFor(p, kind, unit, milestones[0]?.date ?? null),
    chart: chartFor(p, kind, unit),
    milestones,
    picked,
    whatIf: kind === "eta" && p.whatIf ? c.whatIf(ctx.sessions, shortDate(p.whatIf.eta)) : null,
    commitLine: c.commitLine(ctx.sessions),
  };
};
