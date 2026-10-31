import { z } from "zod";

export const AccountabilityScenarioSchema = z.enum([
  "OVER_KCAL",
  "UNDER_PROTEIN",
  "MISSED_LIFT",
  "UNDER_EATING",
  "ON_TRACK",
  "STREAK_BREAK",
  "LOW_READINESS",
]);

export const HistoryStatsSchema = z.object({
  /** Days of history covered (1..21), scaled by account tenure. */
  windowDays: z.number().int().optional(),
  loggedDays: z.number().int(),
  avgKcal: z.number().int().nullable(),
  avgKcalDeltaPct: z.number().int().nullable(),
  plannedSessions: z.number().int(),
  missedSessions: z.number().int(),
  streakDays: z.number().int(),
  lastCheckIns: z.array(z.object({ date: z.string(), status: z.string() })),
});

export const PersonalInsightsSchema = z.object({
  localDate: z.string(),
  fuel: z.object({
    kcalTarget: z.number().int(),
    kcalLogged: z.number().int(),
    kcalRemaining: z.number().int(),
    /** Signed: logged - target (positive = over). */
    kcalDelta: z.number().int().optional(),
    /** max(0, kcalDelta). */
    kcalOver: z.number().int().optional(),
    /** Signed: logged - target (negative = short). */
    proteinGDelta: z.number().optional(),
    proteinGTarget: z.number(),
    proteinGLogged: z.number(),
    proteinGRemaining: z.number(),
    mealCount: z.number().int(),
  }),
  training: z.object({
    workoutTitle: z.string().nullable(),
    workoutDone: z.boolean(),
    sessionsThisWeek: z.number().int(),
    plannedLiftDays: z.number().int(),
  }),
  checkIn: z.object({
    done: z.boolean(),
    status: z.string().nullable(),
    streakDays: z.number().int(),
  }),
  briefing: z.string(),
  tips: z.array(z.string()),
  win: z.string().nullable(),
  scenario: AccountabilityScenarioSchema.optional(),
  secondaryScenarios: z.array(AccountabilityScenarioSchema).optional(),
  /** True when the primary scenario is a call-out (over, missed, short). */
  harsh: z.boolean().optional(),
  /** Primary call-out copy; also tips[0] when harsh. */
  accountabilityTip: z.string().nullable().optional(),
  /** Token-cheap summary over `historyWindowDays` for LLM / UI. */
  historySummary: z.string().optional(),
  /** UTC join date (YYYY-MM-DD). */
  joinedAt: z.string().nullable().optional(),
  /** Whole days since join (min 0). */
  tenureDays: z.number().int().optional(),
  /** Days of history behind historySummary (1..21). */
  historyWindowDays: z.number().int().optional(),
  history: HistoryStatsSchema.optional(),
});

export type AccountabilityScenario = z.infer<typeof AccountabilityScenarioSchema>;
export type HistoryStats = z.infer<typeof HistoryStatsSchema>;
export type PersonalInsights = z.infer<typeof PersonalInsightsSchema>;
