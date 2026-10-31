import { heuristicRecipeChat } from "../adapters/heuristic-recipe-chat";
import { createOpenAiRecipeChat } from "../adapters/openai-recipe-chat";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { RecipeChatPort } from "../ports/recipe-chat";
import { resolveAiProvider } from "./ai/resolve-provider";

/** Provider-swappable Chef. Routes and services call this factory only (never OpenAI directly). */
export const getRecipeChat = (
  env: MirraEnv,
  db?: AppDB,
  opts?: { forceHeuristic?: boolean },
): RecipeChatPort => {
  if (opts?.forceHeuristic) return heuristicRecipeChat;
  switch (resolveAiProvider(env)) {
    case "openai":
      return createOpenAiRecipeChat(env, db);
    default:
      return heuristicRecipeChat;
  }
};
