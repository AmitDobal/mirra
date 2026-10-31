import { z } from "zod";

/** Chef / recipe chat for one planned meal (`meal_plan_items.id`). AMI-127. */

export const RECIPE_CHAT_MAX_MESSAGE_CHARS = 500;

export const RecipeSourceSchema = z.enum(["openai", "heuristic"]);

export const RecipeIngredientSchema = z.object({
  name: z.string(),
  grams: z.number().int(),
  unitLabel: z.string(),
});

export const RecipeSchema = z.object({
  title: z.string(),
  prepMinutes: z.number().int(),
  cookMinutes: z.number().int(),
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(z.string()),
  source: RecipeSourceSchema,
});

export const RecipeChatBodySchema = z.object({
  mealId: z.string().min(1).max(64),
  message: z.string().trim().min(1).max(RECIPE_CHAT_MAX_MESSAGE_CHARS),
  /** Client UUID. Replaying the same id returns the stored reply and charges nothing. */
  clientRequestId: z.string().min(1).max(64).optional(),
});

export const RecipeTurnSchema = z.object({
  id: z.string(),
  idx: z.number().int(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
});

export const RecipeThreadSchema = z.object({
  id: z.string(),
  turnsUsed: z.number().int(),
  maxTurns: z.number().int(),
  turnsLeft: z.number().int(),
});

export const RecipeGuardKindSchema = z.enum(["injection", "medical", "extreme_diet", "off_topic"]);

export const RecipeChatResponseSchema = z.object({
  reply: z.string(),
  /** Set when the scope/safety guard answered. Costs 0 credits and does not use a turn. */
  guard: RecipeGuardKindSchema.optional(),
  source: RecipeSourceSchema,
  thread: RecipeThreadSchema,
  credits: z.object({ charged: z.number().int() }),
});

export const RecipeDetailResponseSchema = z.object({
  recipe: RecipeSchema,
  /** `null` until the first chat message or AI recipe. */
  thread: RecipeThreadSchema.nullable(),
  turns: z.array(RecipeTurnSchema),
  /** Credits an AI recipe / chat message costs (heuristic fallback is free). */
  costs: z.object({ recipe: z.number().int(), chat: z.number().int() }),
});

export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeChatBody = z.infer<typeof RecipeChatBodySchema>;
export type RecipeTurn = z.infer<typeof RecipeTurnSchema>;
export type RecipeThread = z.infer<typeof RecipeThreadSchema>;
export type RecipeChatResponse = z.infer<typeof RecipeChatResponseSchema>;
export type RecipeDetailResponse = z.infer<typeof RecipeDetailResponseSchema>;
