import type { PlannedItem } from "@mirra/contracts";

import { FOODS_BY_ID, type VettedFood } from "../data/vetted-foods";
import { sanitizeAiCopy } from "../lib/ai-copy";
import { staticRecipeSteps } from "../lib/recipe-static";
import type { ChefChatInput, RecipeChatPort } from "../ports/recipe-chat";

/** Offline Chef: keyword intents over the planned meal. Free, never calls a provider. */

const hasAny = (text: string, words: readonly string[]): boolean => words.some((w) => text.includes(w));

const itemInMessage = (items: readonly PlannedItem[], message: string): PlannedItem | undefined =>
  items.find((i) => message.includes(i.name.toLowerCase().split(" ")[0] ?? "~"));

/** Allowed catalog foods with the same primary role as `item`, not already in the meal. */
const swapCandidates = (item: PlannedItem, input: ChefChatInput): VettedFood[] => {
  const role = FOODS_BY_ID.get(item.foodId)?.roles[0];
  const inMeal = new Set(input.meal.items.map((i) => i.foodId));
  return input.rules.allowed
    .filter((f) => (role ? f.roles.includes(role) : true) && !inMeal.has(f.id))
    .slice(0, 3);
};

const swapReply = (input: ChefChatInput, message: string): string => {
  const target = itemInMessage(input.meal.items, message) ?? input.meal.items[0];
  if (!target) return "Tell me which ingredient you want to swap and I'll suggest options.";
  const options = swapCandidates(target, input).map((f) => f.name.toLowerCase());
  if (options.length === 0) return `I don't have a safe swap for ${target.name.toLowerCase()} that fits your settings.`;
  return `You could swap ${target.name.toLowerCase()} for ${options.join(" or ")}. Keep about ${Math.round(target.grams)} g and the macros will land close. Change it in your plan if you like it.`;
};

const scaleReply = (input: ChefChatInput, message: string): string => {
  const num = /\b(\d+)\b/.exec(message);
  const factor = hasAny(message, ["double", "twice"]) ? 2 : num ? Math.min(Math.max(Number(num[1]), 1), 8) : 2;
  const lines = input.meal.items.map((i) => `${i.name.toLowerCase()} ${Math.round(i.grams * factor)} g`);
  return `For ${factor} servings use ${lines.join(", ")}. That is about ${input.meal.kcal * factor} kcal in total.`;
};

export const heuristicChefReply = (input: ChefChatInput): string => {
  const message = input.message.toLowerCase();
  if (hasAny(message, ["swap", "substitut", "replace", "instead", "alternative"])) return swapReply(input, message);
  if (hasAny(message, ["scale", "double", "servings", "people", "serves", "twice"])) return scaleReply(input, message);
  if (hasAny(message, ["faster", "quick", "speed", "shortcut", "less time"]))
    return "To go faster, batch-cook the carb and protein ahead, use pre-cut veg, and cook everything in one pan. Keep the same weights.";
  if (hasAny(message, ["store", "storage", "leftover", "reheat", "fridge", "freeze", "meal prep"]))
    return "Cool it fast, keep it in a sealed box in the fridge up to 3 days, and reheat until steaming hot. Keep fresh veg and sauces separate.";
  if (hasAny(message, ["step", "how", "cook", "recipe", "make"]))
    return `Here is a simple way: ${staticRecipeSteps(input.meal).slice(0, 4).join(" ")}`;
  return "I can help with this meal: faster prep, ingredient swaps, scaling servings, storage, or cooking steps. What would you like?";
};

export const heuristicRecipeChat: RecipeChatPort = {
  chat: async (input) => ({ reply: sanitizeAiCopy(heuristicChefReply(input)), source: "heuristic" }),
  recipe: async (input) => ({
    prepMinutes: 5 + 3 * input.meal.items.length,
    cookMinutes: 15,
    steps: staticRecipeSteps(input.meal),
    source: "heuristic",
  }),
};
