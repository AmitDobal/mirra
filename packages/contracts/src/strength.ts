import { z } from "zod";

import { MuscleGroupIdSchema, MuscleIdSchema, ExerciseMuscleSchema } from "./muscles";

/** Strength Tier ladder (arch §1). Iron → Legendary; divisions III (entry) → I (top). 22 steps. */
export const TIER_IDS = ["iron", "bronze", "silver", "gold", "platinum", "diamond", "elite", "legendary"] as const;
export const TierIdSchema = z.enum(TIER_IDS);

export const TIER_MAX_STEP = 21;

export const TierStandingSchema = z.object({
  step: z.number().int().min(0).max(TIER_MAX_STEP),
  tier: TierIdSchema,
  /** 3 = III (entry), 1 = I (top). Null for Legendary. */
  division: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable(),
  /** "Gold II", "Legendary". */
  label: z.string(),
  /** Percentile vs lifters of the same sex and bodyweight (0..99.9). */
  pct: z.number(),
  /** Progress inside the current step toward the next one. Null at Legendary. */
  progressToNext: z.number().min(0).max(1).nullable(),
});

/** Concrete set that earns the next division (arch §6.4). */
export const NextTargetSchema = z.object({
  toLabel: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string(),
  /** Load lifts: bar/dumbbell kg. Bodyweight lifts: added kg (null = bodyweight only). Time/reps lifts: null. */
  weightKg: z.number().nullable(),
  /** Reps, or seconds for time-scored lifts. */
  reps: z.number().int().min(1),
  /** Sessions at this set needed (EWMA), 1..3. */
  sessions: z.number().int().min(1).max(3),
  /** "185 lb × 8", "+10 kg × 6", "BW × 9", "75 s hold". */
  display: z.string(),
});

export const TierScopeSchema = z.enum(["exercise", "muscle", "group", "overall"]);

export const TierChangeSchema = z.object({
  scope: TierScopeSchema,
  /** Exercise id, muscle id, group id, or "overall". */
  refId: z.string(),
  name: z.string(),
  from: TierStandingSchema.nullable(),
  to: TierStandingSchema,
});

export const StrengthUnitsSchema = z.enum(["metric", "imperial"]);

export const BestSetSchema = z.object({ weightKg: z.number().nullable(), reps: z.number().int() });

export const StrengthUnlockSchema = z.object({
  ranked: z.number().int(),
  rankedNeeded: z.number().int(),
  groups: z.number().int(),
  groupsNeeded: z.number().int(),
});

/** `GET /v1/strength`. */
export const StrengthOverviewResponseSchema = z.object({
  standardsVersion: z.string(),
  units: StrengthUnitsSchema,
  /** True when no bodyweight is known: everything stays unranked ("Add your weight" CTA). */
  needsBodyweight: z.boolean(),
  overall: TierStandingSchema.nullable(),
  unlock: StrengthUnlockSchema,
  groups: z.array(z.object({ id: MuscleGroupIdSchema, standing: TierStandingSchema.nullable() })),
  muscles: z.array(z.object({ id: MuscleIdSchema, standing: TierStandingSchema.nullable() })),
});

export const MuscleContributorSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  involvementPct: z.number(),
  sets90d: z.number().int(),
  /** Null for lifts without a standard (they count toward volume, never tiers). */
  standing: TierStandingSchema.nullable(),
  bestSet: BestSetSchema.nullable(),
});

/** `GET /v1/strength/muscles/:muscleId`. */
export const MuscleStrengthResponseSchema = z.object({
  id: MuscleIdSchema,
  group: MuscleGroupIdSchema,
  units: StrengthUnitsSchema,
  standing: TierStandingSchema.nullable(),
  next: NextTargetSchema.nullable(),
  contributors: z.array(MuscleContributorSchema),
});

/** `GET /v1/strength/exercises/:exerciseId`. */
export const ExerciseStrengthResponseSchema = z.object({
  exerciseId: z.string(),
  name: z.string(),
  units: StrengthUnitsSchema,
  /** True when the lift has a strength standard. */
  ranked: z.boolean(),
  standing: TierStandingSchema.nullable(),
  next: NextTargetSchema.nullable(),
  bestSet: BestSetSchema.nullable(),
  muscles: z.array(ExerciseMuscleSchema),
});

export type TierId = z.infer<typeof TierIdSchema>;
export type TierStanding = z.infer<typeof TierStandingSchema>;
export type NextTarget = z.infer<typeof NextTargetSchema>;
export type TierScope = z.infer<typeof TierScopeSchema>;
export type TierChange = z.infer<typeof TierChangeSchema>;
export type StrengthUnits = z.infer<typeof StrengthUnitsSchema>;
export type BestSet = z.infer<typeof BestSetSchema>;
export type StrengthOverviewResponse = z.infer<typeof StrengthOverviewResponseSchema>;
export type MuscleContributor = z.infer<typeof MuscleContributorSchema>;
export type MuscleStrengthResponse = z.infer<typeof MuscleStrengthResponseSchema>;
export type ExerciseStrengthResponse = z.infer<typeof ExerciseStrengthResponseSchema>;
