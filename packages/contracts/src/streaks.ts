import { z } from "zod";

export const StreakKindSchema = z.enum(["check_in", "workout"]);

/**
 * `lit` = counted today, `at_risk` = alive but nothing counted yet today (yesterday was the last day),
 * `cold` = no live streak (never started or broken).
 */
export const StreakFireStateSchema = z.enum(["lit", "at_risk", "cold"]);

export const StreakSchema = z.object({
  kind: StreakKindSchema,
  /** Effective count as of the user's local today (0 once the streak is broken). */
  current: z.number().int().min(0),
  best: z.number().int().min(0),
  lastActiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  freezeRemaining: z.number().int().min(0),
  fire: StreakFireStateSchema,
});

export const StreaksResponseSchema = z.object({
  /** User's local today (profile timezone). */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  streaks: z.array(StreakSchema),
});

export type StreakKind = z.infer<typeof StreakKindSchema>;
export type StreakFireState = z.infer<typeof StreakFireStateSchema>;
export type Streak = z.infer<typeof StreakSchema>;
export type StreaksResponse = z.infer<typeof StreaksResponseSchema>;
