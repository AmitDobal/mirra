import { apiFetch, MirraApiError } from "./client";

/** Mirrors contracts `recipe-chat.ts` (`/v1/recipe/*`). Chef thread is tied to a planned meal id. */

export type RecipeSource = "openai" | "heuristic";

export type Recipe = {
  readonly title: string;
  readonly prepMinutes: number;
  readonly cookMinutes: number;
  readonly ingredients: readonly { readonly name: string; readonly grams: number; readonly unitLabel: string }[];
  readonly steps: readonly string[];
  readonly source: RecipeSource;
};

export type ChefTurn = {
  readonly id: string;
  readonly idx: number;
  readonly role: "user" | "assistant";
  readonly text: string;
};

export type ChefThread = {
  readonly id: string;
  readonly turnsUsed: number;
  readonly maxTurns: number;
  readonly turnsLeft: number;
};

export type RecipeDetail = {
  readonly recipe: Recipe;
  readonly thread: ChefThread | null;
  readonly turns: readonly ChefTurn[];
  readonly costs: { readonly recipe: number; readonly chat: number };
};

export type ChefReply = {
  readonly reply: string;
  readonly guard?: "injection" | "medical" | "extreme_diet" | "off_topic";
  readonly source: RecipeSource;
  readonly thread: ChefThread;
  readonly credits: { readonly charged: number };
};

const HEURISTIC = { "x-mirra-ai-mode": "heuristic" } as const;
const mealPath = (mealId: string) => `/v1/recipe/${encodeURIComponent(mealId)}`;

export const getRecipeDetail = (mealId: string) => apiFetch<RecipeDetail>(mealPath(mealId));

export const generateRecipe = (mealId: string, opts: { heuristic?: boolean } = {}) =>
  apiFetch<RecipeDetail>(`${mealPath(mealId)}/generate`, {
    method: "POST",
    body: {},
    headers: opts.heuristic ? HEURISTIC : undefined,
    quiet: true, // 402 / 409 / 422 are expected states with their own UI
  });

export const sendChefMessage = (
  body: { mealId: string; message: string; clientRequestId: string },
  opts: { heuristic?: boolean } = {},
) =>
  apiFetch<ChefReply>("/v1/recipe/chat", {
    method: "POST",
    body,
    headers: opts.heuristic ? HEURISTIC : undefined,
    quiet: true, // 402 / 409 / 422 are expected states with their own UI
  });

/** 402 `ai_credits_exhausted` (heuristic Chef is still free). */
export const isOutOfCredits = (err: unknown): boolean =>
  err instanceof MirraApiError && err.status === 402;
