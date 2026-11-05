/**
 * §3 milestones, built only from data we have. Pure.
 */
import { addDays, dayNumber } from "./dates";
import { firstCrossing } from "./trend";
import type {
  GoalDirection,
  GoalMilestone,
  GoalMilestoneKind,
  GoalMode,
  GoalType,
  GoalUnits,
  IsoDate,
  SessionDay,
  StrengthNext,
  TrendPoint,
} from "./types";
import { formatDelta, formatWeight } from "./units";

export const MAX_MILESTONES = 8;
const FIRST_CHANGE_SHARE = 0.03;
const PCT5_SHARE = 0.05;
/** Skip `pct5` / `plus1kg` this close to halfway or goal (doc says 1 kg; see AMI-178 notes). */
const CROWD_KG = 0.5;
const RECOMP_MIN_A = 0.75;
const PHOTO_EVERY_DAYS = 28;
const PHOTO_SLACK_DAYS = 7;
const PHOTO_SHOW = 4;
const HABIT_SPANS = [14, 30, 66] as const;
const HABIT_SHARE = 0.75;

export type Reach = { expected: IsoDate | null; optimistic: IsoDate | null; conservative: IsoDate | null };

export type MilestoneInput = {
  goalType: GoalType;
  mode: GoalMode;
  direction: GoalDirection;
  units: GoalUnits;
  startDate: IsoDate;
  today: IsoDate;
  startKg: number | null;
  targetKg: number | null;
  currentKg: number | null;
  points: readonly TrendPoint[];
  adherenceScore: number;
  sessions: readonly SessionDay[];
  photoDates: readonly IsoDate[];
  strengthNext: StrengthNext | null;
  strengthStepUps: number;
  /** Dates the projection reaches `kg` (expected / optimistic / conservative). */
  reach: (kg: number) => Reach;
};

const passed = (cur: number | null, kg: number, dir: GoalDirection) =>
  cur !== null && (dir === "down" ? cur <= kg : dir === "up" ? cur >= kg : false);

const near = (a: number, b: number) => Math.abs(a - b) < CROWD_KG;

const ms = (
  id: string,
  kind: GoalMilestoneKind,
  label: string,
  detail: string | null,
  date: IsoDate | null,
  window: [IsoDate, IsoDate] | null,
  done: boolean,
): GoalMilestone => ({ id, kind, label, detail, date, window, done });

const weightMilestone = (m: MilestoneInput, id: string, kind: GoalMilestoneKind, label: string, detail: string | null, kg: number) => {
  if (passed(m.currentKg, kg, m.direction)) return ms(id, kind, label, detail, firstCrossing(m.points, kg, m.direction), null, true);
  const r = m.reach(kg);
  const window: [IsoDate, IsoDate] | null = r.optimistic && r.conservative ? [r.optimistic, r.conservative] : null;
  return ms(id, kind, label, detail, r.expected, window, false);
};

/** Is `kg` strictly between start and target (or past start when there is no target)? */
const onTheWay = (m: MilestoneInput, kg: number) => {
  if (m.startKg === null) return false;
  if (m.targetKg === null) return true;
  return m.direction === "down" ? kg > m.targetKg && kg < m.startKg : kg < m.targetKg && kg > m.startKg;
};

const cutMilestones = (m: MilestoneInput, s: number): GoalMilestone[] => {
  const out: GoalMilestone[] = [];
  const first = s * (1 - FIRST_CHANGE_SHARE);
  if (onTheWay(m, first)) out.push(weightMilestone(m, "first_change", "visual", "First visible change (often)", formatDelta(first - s, m.units), first));
  const half = m.targetKg !== null ? (s + m.targetKg) / 2 : null;
  if (half !== null) out.push(weightMilestone(m, "halfway", "weight", `Halfway · ${formatWeight(half, m.units)}`, null, half));
  const p5 = s * (1 - PCT5_SHARE);
  const crowded = (half !== null && near(p5, half)) || (m.targetKg !== null && near(p5, m.targetKg));
  if (onTheWay(m, p5) && !crowded) out.push(weightMilestone(m, "pct5", "weight", `5% down · ${formatWeight(p5, m.units)}`, null, p5));
  return out;
};

const gainMilestones = (m: MilestoneInput, s: number): GoalMilestone[] => {
  const w: [IsoDate, IsoDate] = [addDays(m.startDate, 14), addDays(m.startDate, 42)];
  const out = [ms("strength_first", "strength", "Strength usually climbs first", "Weeks 2–6", null, w, m.strengthStepUps > 0)];
  const half = m.targetKg !== null ? (s + m.targetKg) / 2 : null;
  const plus1 = s + 1;
  const crowded = (half !== null && near(plus1, half)) || (m.targetKg !== null && near(plus1, m.targetKg));
  if (onTheWay(m, plus1) && !crowded) out.push(weightMilestone(m, "plus1kg", "weight", `First ${formatDelta(1, m.units)}`, formatWeight(plus1, m.units), plus1));
  if (half !== null) out.push(weightMilestone(m, "halfway", "weight", `Halfway · ${formatWeight(half, m.units)}`, null, half));
  return out;
};

const recompMilestones = (m: MilestoneInput): GoalMilestone[] => {
  const out: GoalMilestone[] = [];
  if (m.adherenceScore >= RECOMP_MIN_A) {
    const w: [IsoDate, IsoDate] = [addDays(m.startDate, 56), addDays(m.startDate, 84)];
    out.push(ms("first_change", "visual", "First visible change", "Often visible in photos around weeks 8–12", null, w, false));
  }
  const since = dayNumber(m.today) - dayNumber(m.startDate);
  const photos = m.photoDates.map(dayNumber);
  const last = Math.max(PHOTO_SHOW, Math.floor((since + 2 * PHOTO_EVERY_DAYS) / PHOTO_EVERY_DAYS));
  for (let k = Math.max(1, last - PHOTO_SHOW + 1); k <= last; k += 1) {
    const date = addDays(m.startDate, k * PHOTO_EVERY_DAYS);
    const n = dayNumber(date);
    const done = photos.some((p) => Math.abs(p - n) <= PHOTO_SLACK_DAYS);
    const win: [IsoDate, IsoDate] = [addDays(date, -PHOTO_SLACK_DAYS), addDays(date, PHOTO_SLACK_DAYS)];
    out.push(ms(`photo_w${k * 4}`, "photo", `Progress photo · week ${k * 4}`, null, date, win, done));
  }
  return out;
};

const habitMilestones = (m: MilestoneInput): GoalMilestone[] => {
  const s0 = dayNumber(m.startDate);
  const since = dayNumber(m.today) - s0;
  return HABIT_SPANS.map((n) => {
    const span = m.sessions.filter((x) => {
      const d = dayNumber(x.date) - s0;
      return d >= 0 && d < n;
    });
    const done = since >= n && span.length > 0 && span.filter((x) => x.done).length >= HABIT_SHARE * span.length;
    const detail = n === 66 ? "Research puts the median at about 66 days; it varies a lot" : null;
    return ms(`habit${n}`, "habit", `${n}-day habit`, detail, addDays(m.startDate, n), null, done);
  });
};

const strengthMilestone = (m: MilestoneInput, next: StrengthNext): GoalMilestone => {
  const weeks = next.perWeek > 0 ? Math.ceil(next.sessions / next.perWeek) : null;
  return ms("next_division", "strength", next.label, next.detail, weeks === null ? null : addDays(m.today, weeks * 7), null, false);
};

/** Sort key: the milestone date, else its window start; undated rows go last. */
const sortKey = (x: GoalMilestone): number => {
  const d = x.date ?? x.window?.[0] ?? null;
  return d === null ? Number.POSITIVE_INFINITY : dayNumber(d);
};

/** Chronological (AMI-183). Stable; on a date tie the goal row stays last. */
export const sortMilestones = (rows: readonly GoalMilestone[]): GoalMilestone[] =>
  rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => sortKey(a.row) - sortKey(b.row) || Number(a.row.id === "goal") - Number(b.row.id === "goal") || a.i - b.i)
    .map((x) => x.row);

export const buildMilestones = (m: MilestoneInput): GoalMilestone[] => {
  const out: GoalMilestone[] = [];
  const s = m.startKg;
  const weightGoal = m.goalType === "fat_loss" || m.goalType === "muscle_gain";
  if (weightGoal && s !== null && m.mode !== "milestones") {
    out.push(...(m.direction === "down" ? cutMilestones(m, s) : gainMilestones(m, s)));
  }
  if (m.goalType === "recomp") out.push(...recompMilestones(m));
  if (m.goalType === "general_fitness") out.push(...habitMilestones(m));
  if (m.mode === "eta" && m.targetKg !== null) {
    out.push(weightMilestone(m, "goal", "weight", `Goal · ${formatWeight(m.targetKg, m.units)}`, null, m.targetKg));
  }
  const capped = out.slice(0, m.strengthNext ? MAX_MILESTONES - 1 : MAX_MILESTONES);
  if (m.strengthNext) capped.push(strengthMilestone(m, m.strengthNext));
  return sortMilestones(capped);
};
