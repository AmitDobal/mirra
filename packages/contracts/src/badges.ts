import { z } from "zod";

export const BadgeLadderSchema = z.enum(["kinetic_rank", "streak_milestone"]);

export const BadgeDefinitionSchema = z.object({
  id: z.string(),
  ladder: BadgeLadderSchema,
  tier: z.number().int().min(1),
  title: z.string(),
  /** Best check-in streak days required (kinetic ranks). */
  thresholdDays: z.number().int().min(1),
  stitchAssetKey: z.string().nullable(),
});

export const UserBadgeSchema = z.object({
  badgeId: z.string(),
  unlockedAt: z.number().int(),
});

export const BadgesResponseSchema = z.object({
  definitions: z.array(BadgeDefinitionSchema),
  unlocked: z.array(UserBadgeSchema),
  /** Cached best check-in streak (same source as streak recompute). */
  bestStreak: z.number().int().min(0),
  /** Highest kinetic rank earned; null if below Spark. */
  currentRankId: z.string().nullable(),
  /** Next rank not yet unlocked; null at Apex. */
  nextRankId: z.string().nullable(),
});

export type BadgeLadder = z.infer<typeof BadgeLadderSchema>;
export type BadgeDefinition = z.infer<typeof BadgeDefinitionSchema>;
export type UserBadge = z.infer<typeof UserBadgeSchema>;
export type BadgesResponse = z.infer<typeof BadgesResponseSchema>;
