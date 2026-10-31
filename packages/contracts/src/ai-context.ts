import { z } from "zod";

/**
 * Feature-scoped snapshot handed to AI generators (architecture F).
 * See docs/03-engineering/ai-context-and-credits-architecture.md §A and §D.
 * Shared with mobile for debug screens only. Never sent to a client in prod flows.
 */

export const AiContextFeatureSchema = z.enum(["coach", "workout_plan", "meal_plan", "recipe_chat"]);
export type AiContextFeature = z.infer<typeof AiContextFeatureSchema>;

const userSetting = z.literal("user_setting");

/** Hard constraints may ONLY come from explicit settings. Never from notes, behavior or the LLM. */
export const HardConstraintSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("allergy"), value: z.string().max(40), source: userSetting }),
  z.object({ type: z.literal("diet"), value: z.string().max(40), source: userSetting }),
  z.object({ type: z.literal("avoid_food"), value: z.string().max(60), source: userSetting }),
  z.object({ type: z.literal("cuisine_only"), value: z.string().max(40), source: userSetting }),
  z.object({ type: z.literal("equipment"), value: z.string().max(40), source: userSetting }),
  z.object({ type: z.literal("excluded_movement"), value: z.string().max(60), source: userSetting }),
  z.object({ type: z.literal("injury"), value: z.string().max(60), source: userSetting }),
]);
export type HardConstraint = z.infer<typeof HardConstraintSchema>;

export const ContextMemorySchema = z.object({
  text: z.string().max(200),
  source: z.enum(["user_setting", "user_message", "behavior", "health_sync"]),
  confidence: z.number().min(0).max(1),
});

export const ContextEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  feature: AiContextFeatureSchema,
  profile: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string())]),
  ),
  hardConstraints: z.array(HardConstraintSchema).max(40),
  currentState: z.record(z.string(), z.union([z.number(), z.string(), z.boolean(), z.null()])),
  relevantMemories: z.array(ContextMemorySchema).max(8),
  generatedAt: z.string().datetime(),
  /** sha256 hex of settings content (profile, constraints, memories, feature, version; not `currentState` or `generatedAt`). Cache key and log field instead of prompt bodies. */
  contextHash: z.string().length(64),
});
export type ContextEnvelope = z.infer<typeof ContextEnvelopeSchema>;

/** Input for `PersonalizationContextPort.build`. */
export type PersonalizationContextInput = {
  userId: string;
  feature: AiContextFeature;
  /** recipe_chat: plan item being discussed. workout_plan: week start. */
  subjectId?: string;
  /** Today in the user's timezone, YYYY-MM-DD. */
  localDate: string;
  /** Request-scoped overrides (rebuild shifts train days). Never persisted. */
  overrides?: { trainDays?: number[] };
};
