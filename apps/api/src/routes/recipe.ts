import { RecipeChatBodySchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { parseBody } from "../lib/validate";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { generateRecipe, getRecipeDetail, sendChefMessage, type RecipeCtx } from "../services/recipe-chat";

export const recipeRoutes = new Hono<{ Bindings: MirraEnv; Variables: AuthVars }>();

type RouteCtx = { env: MirraEnv; get: (key: "userId") => string; req: { header: (n: string) => string | undefined } };

/** `x-mirra-ai-mode: heuristic` forces the free path (same switch as the coach). */
const ctxOf = (c: RouteCtx): RecipeCtx => ({
  env: c.env,
  db: createDb(c.env.DB),
  userId: c.get("userId"),
  forceHeuristic: c.req.header("x-mirra-ai-mode")?.toLowerCase() === "heuristic",
});

/** Recipe + thread + turns for one planned meal. Free: cached AI recipe or template. */
recipeRoutes.get("/v1/recipe/:mealId", requireAuth, async (c) =>
  c.json(await getRecipeDetail(ctxOf(c), c.req.param("mealId"))),
);

/** AI recipe (recipe_gen credits). Heuristic fallback when AI is off or fails. */
recipeRoutes.post("/v1/recipe/:mealId/generate", requireAuth, async (c) =>
  c.json(await generateRecipe(ctxOf(c), c.req.param("mealId"))),
);

/** Chef message (chef_chat credits). 402 when credits are empty, 409 when the thread is capped. */
recipeRoutes.post("/v1/recipe/chat", requireAuth, async (c) => {
  const body = parseBody(RecipeChatBodySchema, await c.req.json().catch(() => ({})));
  return c.json(await sendChefMessage(ctxOf(c), body));
});
