/**
 * `GET /v1/goal` body → S44 screen + S45/S46 card view model. Pure (no RN) → `node --test`.
 * Honest copy (arch §7): "around <date>" with the range beside it, never a promise.
 */
import { goalEngine, kgToLb, type GoalResponse } from "@mirra/contracts";

import { goalCopy } from "../../content/goal";
import type { GoalChartData } from "./chart/goal-chart-model";
import { dateRange, shortDate, weightDelta, weightPair, weightText, type WeightUnit } from "./goal-format";

const c = goalCopy.screen;

export type GoalLayout = "eta" | "horizon" | "milestones" | "empty";
export type StatusTone = "lime" | "lavender" | "neutral";
export type MilestoneMarker = "open" | "done" | "goal" | "strength";

export type GoalMilestoneRow = {
  readonly id: string;
  readonly title: string;
  readonly detail: string | null;
  readonly date: string | null;
  readonly marker: MilestoneMarker;
};
export type GoalStat = { readonly label: string; readonly value: string; readonly detail: string };
export type AdherenceRow = { readonly label: string; readonly value: string; readonly ratio: number };

export type GoalView = {
  readonly layout: GoalLayout;
  readonly unit: WeightUnit;
  readonly eyebrow: string;
  readonly headline: string;
  readonly status: { readonly label: string; readonly tone: StatusTone };
  readonly sub: string | null;
  readonly notices: readonly string[];
  readonly chart: {
    readonly data: GoalChartData;
    readonly etaWeeks: number | null;
    readonly caption: string;
    readonly a11y: string;
  } | null;
  readonly stats: readonly GoalStat[] | null;
  readonly milestones: readonly GoalMilestoneRow[];
  readonly adherence: readonly AdherenceRow[];
  readonly action: string | null;
  readonly showSetGoal: boolean;
  readonly card: { readonly title: string; readonly sub: string };
};

export type GoalViewInput = {
  readonly body: GoalResponse | null;
  /** Fallback when the body has no chart (unit comes from the chart otherwise). */
  readonly unit: WeightUnit;
  /** Planned sessions per week (`preferences.trainDays.length`), for "Keep 4 of 4". */
  readonly sessionsPerWeek: number | null;
};

const TONE: Record<GoalResponse["status"], StatusTone> = {
  on_track: "lime",
  ahead: "lime",
  calibrating: "lavender",
  behind: "neutral",
  no_target: "neutral",
};

/** Stat number: kg to 0.1 ("82.0 kg"), lb whole. */
export const statWeight = (kg: number, unit: WeightUnit): string =>
  unit === "lb" ? `${Math.round(kgToLb(kg))} lb` : `${(Math.round(kg * 10) / 10).toFixed(1)} kg`;

/** Engine label "Halfway · 78.5 kg" → title + detail; S44 wording for first change / 5 % / goal. */
export const milestoneRow = (m: GoalResponse["milestones"][number]): GoalMilestoneRow => {
  const [head = m.label, ...rest] = m.label.split(" · ");
  const tail = rest.join(" · ") || null;
  let title = head;
  let detail = m.detail ?? tail;
  if (m.id === "first_change" && m.kind === "visual") {
    title = c.firstChange;
    if (m.detail && m.date) detail = c.firstChangeDetail(m.detail);
  } else if (m.id === "pct5") {
    title = c.pct5;
  } else if (m.id === "goal") {
    title = c.goalRow;
  }
  const date = m.date ? shortDate(m.date) : m.window ? dateRange(m.window[0], m.window[1]) : null;
  const marker: MilestoneMarker =
    m.id === "goal" ? "goal" : m.kind === "strength" ? "strength" : m.done ? "done" : "open";
  return { id: m.id, title, detail, date, marker };
};

export const adherenceRows = (a: GoalResponse["adherence"]): AdherenceRow[] => {
  const k = a.counts;
  if (k) {
    const rows: AdherenceRow[] = [];
    const frac = (x: number, of: number) => (of > 0 ? Math.min(1, x / of) : 0);
    if (k.training.planned > 0) {
      rows.push({ label: c.rows.sessions, value: c.ratio(k.training.done, k.training.planned), ratio: frac(k.training.done, k.training.planned) });
    }
    if (k.checkIn.of > 0) {
      rows.push({ label: c.rows.checkIns, value: c.ratio(k.checkIn.days, k.checkIn.of), ratio: frac(k.checkIn.days, k.checkIn.of) });
    }
    if (k.fuel && k.fuel.logged > 0) {
      rows.push({ label: c.rows.fuel, value: c.fuelRatio(k.fuel.onTarget, k.fuel.logged), ratio: frac(k.fuel.onTarget, k.fuel.logged) });
    }
    return rows;
  }
  const pct = (label: string, r: number | null): AdherenceRow[] =>
    r === null ? [] : [{ label, value: c.percent(r), ratio: Math.max(0, Math.min(1, r)) }];
  return [...pct(c.rows.sessions, a.training), ...pct(c.rows.checkIns, a.checkIn), ...pct(c.rows.fuel, a.fuel)];
};

const sessionsGuess = (body: GoalResponse, perWeek: number | null): number | null => {
  if (perWeek && perWeek > 0) return perWeek;
  const planned = body.adherence.counts?.training.planned ?? 0;
  return planned > 0 ? Math.max(1, Math.round(planned / 4)) : null;
};

/** One concrete line for "Stay on track" (arch §6 rules 3–4: one action, no shame, no push). */
export const actionLine = (body: GoalResponse, perWeek: number | null): string | null => {
  const n = sessionsGuess(body, perWeek);
  const w = body.whatIf;
  const whatLine = !w
    ? null
    : w.lever === "training"
      ? c.whatIf.training(n, shortDate(w.eta))
      : w.lever === "fuel"
        ? c.whatIf.fuel(shortDate(w.eta))
        : c.whatIf.check_in(shortDate(w.eta));
  if (body.flags.includes("trend_reversed")) return c.reversed(body.band.expected ? shortDate(body.band.expected) : null);
  if (body.status === "behind") return whatLine ?? c.behind(n);
  if (whatLine) return whatLine;
  if (body.band.expected && (body.status === "on_track" || body.status === "ahead")) {
    const d = shortDate(body.band.expected);
    return n ? c.keep(n, d) : c.keepAny(d);
  }
  return null;
};

const flagNotices = (body: GoalResponse, unit: WeightUnit): string[] => {
  const f = goalCopy.onboarding.flags;
  const plan = body.plan;
  const out: string[] = [];
  if (body.status === "calibrating") out.push(c.calibrating);
  for (const flag of body.flags) {
    if (flag === "direction_mismatch") out.push(f.direction_mismatch(plan?.direction === "down"));
    else if (flag === "minor_pace") out.push(f.minor_pace);
    else if (flag === "kcal_floor") out.push(f.kcal_floor);
    else if (flag === "beyond_horizon") out.push(f.beyond_horizon);
    else if (flag === "target_below_healthy" && plan?.targetEffectiveKg != null) {
      out.push(f.target_below_healthy(weightText(plan.targetEffectiveKg, unit)));
    }
  }
  return out;
};

const chartView = (body: GoalResponse, layout: GoalLayout, unit: WeightUnit): GoalView["chart"] => {
  const ch = body.chart;
  if (!ch || layout === "empty") return null;
  if (layout === "milestones" && ch.actual.length < 2) return null;
  const expected = layout === "eta" ? body.band.expected : null;
  const etaWeeks = expected ? goalEngine.diffDays(expected, ch.start) / 7 : null;
  const start = body.plan?.startWeightKg ?? ch.planned[0] ?? null;
  const now = body.trendKg ?? start;
  const end = ch.targetKg ?? now;
  const a11y = start !== null && end !== null
    ? goalCopy.chart.a11y(weightText(start, unit), weightText(end, unit), expected ? shortDate(expected) : null)
    : c.chartTitle;
  return {
    data: { ...ch, unit, targetKg: layout === "eta" ? ch.targetKg : null },
    etaWeeks,
    caption: c.lastWeeks(Math.max(1, Math.round(ch.todayIndex))),
    a11y,
  };
};

const layoutOf = (body: GoalResponse | null): GoalLayout => {
  if (!body?.plan) return "empty";
  if (body.plan.mode === "horizon") return "horizon";
  if (body.plan.mode === "milestones") return "milestones";
  return "eta";
};

export const buildGoalView = ({ body, unit: fallbackUnit, sessionsPerWeek }: GoalViewInput): GoalView => {
  const layout = layoutOf(body);
  const unit: WeightUnit = body?.chart?.unit ?? fallbackUnit;
  const status = body?.status ?? "no_target";
  const empty: GoalView = {
    layout, unit, eyebrow: "", headline: c.emptyTitle, status: { label: c.status.no_target, tone: "neutral" },
    sub: c.emptyBody, notices: [], chart: null, stats: null, milestones: [], adherence: [], action: null,
    showSetGoal: false, card: { title: c.emptyTitle, sub: c.emptyBody },
  };
  if (!body?.plan || layout === "empty") return empty;
  const plan = body.plan;
  const pace = c.pace[plan.pace ?? "steady"] ?? c.pace.steady!;
  const eyebrow = `${c.goal[plan.primaryGoal] ?? plan.primaryGoal} · ${pace}`;
  const { expected, optimistic, conservative } = body.band;
  const range = expected ? dateRange(optimistic ?? expected, conservative ?? expected) : null;
  const next = body.milestones.find((m) => !m.done) ?? null;

  let headline: string = c.noDate;
  let sub: string | null = null;
  if (layout === "eta" && expected) {
    headline = c.around(shortDate(expected));
    const moved = plan.originalEta && plan.originalEta !== expected
      ? (plan.originalEta > expected ? c.movedUp : c.movedBack)(shortDate(plan.originalEta))
      : null;
    sub = [c.range(range!), moved].filter(Boolean).join(" · ");
  } else if (layout === "horizon") {
    headline = c.noGoalWeight;
    sub = c.horizonSub;
  } else if (layout === "milestones" && next) {
    headline = c.nextHeadline(milestoneRow(next).title);
    sub = next.date ? c.nextSub(shortDate(next.date)) : null;
  }

  const start = plan.startWeightKg;
  const now = body.trendKg;
  const stats: GoalStat[] | null =
    layout === "eta" && start !== null && now !== null && body.toGoKg !== null
      ? [
          { label: c.stats.start, value: statWeight(start, unit), detail: shortDate(plan.startDate) },
          { label: c.stats.now, value: statWeight(now, unit), detail: c.stats.trend },
          { label: c.stats.toGo, value: statWeight(Math.abs(body.toGoKg), unit), detail: c.stats.soFar(weightDelta(now - start, unit)) },
        ]
      : null;

  const target = plan.targetEffectiveKg ?? plan.targetWeightKg;
  const pairText = layout === "eta" && start !== null && target !== null
    ? goalCopy.card.pair(weightPair(start, target, unit), pace)
    : eyebrow;
  const cardSub = layout === "eta" && expected
    ? goalCopy.card.sub(shortDate(expected), range!)
    : layout === "horizon"
      ? goalCopy.card.noTarget
      : sub ?? "";

  return {
    layout,
    unit,
    eyebrow,
    headline,
    status: { label: c.status[status], tone: TONE[status] },
    sub,
    notices: flagNotices(body, unit),
    chart: chartView(body, layout, unit),
    stats,
    milestones: body.milestones.map(milestoneRow),
    adherence: adherenceRows(body.adherence),
    action: actionLine(body, sessionsPerWeek),
    showSetGoal: layout === "horizon",
    card: { title: layout === "milestones" && next ? c.nextHeadline(milestoneRow(next).title) : pairText, sub: cardSub },
  };
};
