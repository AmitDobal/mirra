import type { ContextEnvelope, PlannedMeal, Recipe } from "@mirra/contracts";

import type { SafetyRules } from "../services/recipe-safety-policy";

/** Chef chat + recipe text for ONE planned meal. Adapters never mutate the plan. */

export type RecipeTurnLite = { role: "user" | "assistant"; text: string };

export type RecipeChatContext = {
  userId: string;
  /** `recipe_chat` envelope: hard constraints + targets only. */
  envelope: ContextEnvelope;
  meal: PlannedMeal;
  rules: SafetyRules;
  maxOutputTokens: number;
  /** Set on the repair pass: names the term the previous attempt got wrong. */
  repairHint?: string;
};

export type ChefChatInput = RecipeChatContext & {
  message: string;
  /** Last 6 turns, oldest first. */
  history: RecipeTurnLite[];
};

export type ChefChatResult = { reply: string; source: "openai" | "heuristic" };

/** Ingredients always come from the planned meal, so macros cannot drift. The model writes steps only. */
export type RecipeText = Pick<Recipe, "prepMinutes" | "cookMinutes" | "steps">;
export type RecipeGenResult = RecipeText & { source: "openai" | "heuristic" };

export type RecipeChatPort = {
  chat: (input: ChefChatInput) => Promise<ChefChatResult>;
  recipe: (input: RecipeChatContext) => Promise<RecipeGenResult>;
};
