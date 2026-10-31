import {
  type Recipe,
  type RecipeChatBody,
  type RecipeChatResponse,
  type RecipeDetailResponse,
} from "@mirra/contracts";

import { heuristicRecipeChat } from "../adapters/heuristic-recipe-chat";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import { resolveAiProvider } from "../lib/ai/resolve-provider";
import { CREDIT_COSTS, resolveCreditsMode } from "../lib/ai-credits";
import type { AiFeature } from "../lib/ai-quotas";
import { todayUtc } from "../lib/dates";
import { ApiError, conflict } from "../lib/errors";
import { parseJson } from "../lib/json";
import { getPersonalizationContext } from "../lib/personalization-context";
import { buildStaticRecipe } from "../lib/recipe-static";
import { getRecipeChat } from "../lib/recipe-chat";
import type { RecipeChatContext } from "../ports/recipe-chat";
import { canSpend } from "./ai-budget";
import { withAiCredits } from "./credits-gate";
import { loadOwnedItem } from "./meal-plan-items";
import { toPlannedMeal } from "./meal-plan-store";
import { guardMessage } from "./recipe-chat-guard";
import {
  claimUserTurn,
  countRecentUserTurns,
  dropTurn,
  findReplay,
  findThread,
  finishTurn,
  getOrCreateThread,
  listHistory,
  listTurns,
  saveRecipe,
  toThreadView,
  toTurnView,
} from "./recipe-chat-store";
import {
  buildSafetyRules,
  constraintViolationReply,
  findForbiddenTerm,
  findRequestedViolation,
  type SafetyRules,
} from "./recipe-safety-policy";

export type RecipeCtx = { env: MirraEnv; db: AppDB; userId: string; forceHeuristic: boolean };

export const DEFAULT_MAX_TURNS = 8;
export const MAX_OUTPUT_TOKENS = { chef_chat: 500, recipe_gen: 700 } as const;
const DEFAULT_RATE_PER_MINUTE = 6;

const ratePerMinuteOf = (env: MirraEnv): number => {
  const n = Number.parseInt(env.RECIPE_CHAT_RATE_PER_MIN ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : DEFAULT_RATE_PER_MINUTE;
};

const maxTurnsOf = (env: MirraEnv): number => {
  const n = Number.parseInt(env.RECIPE_CHAT_MAX_TURNS ?? "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 30 ? n : DEFAULT_MAX_TURNS;
};

/** Paid only when a real provider is configured, not forced off, and the monthly token budget allows. */
const isPaid = async (ctx: RecipeCtx, feature: AiFeature): Promise<boolean> =>
  !ctx.forceHeuristic &&
  resolveAiProvider(ctx.env) === "openai" &&
  (await canSpend(ctx.db, ctx.userId, feature));

const chargedFor = (ctx: RecipeCtx, feature: "chef_chat" | "recipe_gen", source: string): number =>
  source === "openai" && resolveCreditsMode(ctx.env) !== "off" ? CREDIT_COSTS[feature] : 0;

const loadContext = async (ctx: RecipeCtx, itemId: string) => {
  const { item } = await loadOwnedItem(ctx.db, ctx.userId, itemId);
  const meal = toPlannedMeal(item);
  const envelope = await getPersonalizationContext(ctx.env, ctx.db).build({
    userId: ctx.userId,
    feature: "recipe_chat",
    subjectId: item.id,
    localDate: todayUtc(),
  });
  const rules = buildSafetyRules(envelope, meal.items.map((i) => i.name));
  return { item, meal, envelope, rules, recipeKey: `${envelope.contextHash}:${item.updatedAt.getTime()}` };
};

/**
 * Call the model; if its text names a forbidden food, retry once with a hint, then fall back
 * to the free heuristic (source "heuristic" → the gate releases the hold).
 */
const validated = async <T extends { source: string }>(
  attempt: (repairHint?: string) => Promise<T>,
  textOf: (out: T) => string,
  rules: SafetyRules,
  fallback: () => Promise<T>,
): Promise<T> => {
  let out = await attempt();
  if (out.source !== "openai") return out;
  let bad = findForbiddenTerm(textOf(out), rules);
  if (!bad) return out;
  out = await attempt(`Do not mention "${bad}".`);
  if (out.source !== "openai") return out;
  bad = findForbiddenTerm(textOf(out), rules);
  return bad ? fallback() : out;
};

const costs = { recipe: CREDIT_COSTS.recipe_gen, chat: CREDIT_COSTS.chef_chat };

/** Instant read: cached AI recipe when current, else the free template. Never spends credits. */
export const getRecipeDetail = async (ctx: RecipeCtx, itemId: string): Promise<RecipeDetailResponse> => {
  const { meal, recipeKey, item } = await loadContext(ctx, itemId);
  const thread = await findThread(ctx.db, ctx.userId, item.id);
  const cached =
    thread?.recipeJson && thread.recipeKey === recipeKey ? parseJson<Recipe | null>(thread.recipeJson, null) : null;
  return {
    recipe: cached ?? buildStaticRecipe(meal),
    thread: thread ? toThreadView(thread) : null,
    turns: thread ? (await listTurns(ctx.db, thread.id)).map(toTurnView) : [],
    costs,
  };
};

/** AI recipe for the planned meal (recipe_gen). Cached per (settings hash, item version): re-reads are free. */
export const generateRecipe = async (ctx: RecipeCtx, itemId: string): Promise<RecipeDetailResponse> => {
  const { item, meal, envelope, rules, recipeKey } = await loadContext(ctx, itemId);
  const thread = await getOrCreateThread(ctx.db, ctx.userId, item.id, maxTurnsOf(ctx.env));
  if (thread.recipeJson && thread.recipeKey === recipeKey) return getRecipeDetail(ctx, itemId);

  const port = getRecipeChat(ctx.env, ctx.db, { forceHeuristic: ctx.forceHeuristic });
  const base: RecipeChatContext = {
    userId: ctx.userId,
    envelope,
    meal,
    rules,
    maxOutputTokens: MAX_OUTPUT_TOKENS.recipe_gen,
  };
  const text = await withAiCredits(
    ctx,
    { feature: "recipe_gen", paid: await isPaid(ctx, "recipe_gen"), wasPaid: (r) => r.source === "openai" },
    () =>
      validated(
        (repairHint) => port.recipe({ ...base, repairHint }),
        (r) => r.steps.join(" "),
        rules,
        () => heuristicRecipeChat.recipe(base),
      ),
  );
  if (text.source === "openai") {
    const recipe = { ...buildStaticRecipe(meal), ...text, title: meal.title };
    await saveRecipe(ctx.db, thread.id, {
      json: JSON.stringify(recipe),
      key: recipeKey,
      source: "openai",
      contextHash: envelope.contextHash,
    });
  }
  return getRecipeDetail(ctx, itemId);
};

/**
 * One Chef message. Order (cheap checks first, credits last):
 * 404 ownership → replay → 409 thread cap → 429 rate → scope guard → 422 banned-food request
 * → claim turn → reserve → LLM (+1 repair) → post-validate → settle → persist.
 */
export const sendChefMessage = async (ctx: RecipeCtx, body: RecipeChatBody): Promise<RecipeChatResponse> => {
  const { item, meal, envelope, rules } = await loadContext(ctx, body.mealId);
  const thread = await getOrCreateThread(ctx.db, ctx.userId, item.id, maxTurnsOf(ctx.env));
  const view = (t: typeof thread) => toThreadView(t);

  if (body.clientRequestId) {
    const replay = await findReplay(ctx.db, thread.id, body.clientRequestId);
    if (replay) {
      const source = replay.source === "openai" ? "openai" : "heuristic";
      return { reply: replay.text, source, thread: view(thread), credits: { charged: 0 } };
    }
  }
  if (thread.turnCount >= thread.maxTurns) {
    throw new ApiError("thread_capped", "This chat has reached its limit. Your recipe is still here.", 409, {
      maxTurns: thread.maxTurns,
    });
  }
  if ((await countRecentUserTurns(ctx.db, ctx.userId, Date.now() - 60_000)) >= ratePerMinuteOf(ctx.env)) {
    throw new ApiError("rate_limited", "Too many messages. Wait a minute and try again.", 429, { retryAfterSec: 60 });
  }
  const guard = guardMessage(body.message);
  if (guard) {
    return { reply: guard.reply, guard: guard.kind, source: "heuristic", thread: view(thread), credits: { charged: 0 } };
  }
  const requested = findRequestedViolation(body.message, rules);
  if (requested) {
    throw new ApiError("constraint_violation", constraintViolationReply(requested), 422, { constraint: requested });
  }

  const history = (await listHistory(ctx.db, thread.id)).map((t) => ({
    role: t.role as "user" | "assistant",
    text: t.text,
  }));
  const userTurn = await claimUserTurn(ctx.db, thread, body.message, body.clientRequestId);
  if (!userTurn) throw conflict("Chef is still answering. Try again in a moment.");

  try {
    const port = getRecipeChat(ctx.env, ctx.db, { forceHeuristic: ctx.forceHeuristic });
    const input = {
      userId: ctx.userId,
      envelope,
      meal,
      rules,
      maxOutputTokens: MAX_OUTPUT_TOKENS.chef_chat,
      message: body.message,
      history,
    };
    const result = await withAiCredits(
      ctx,
      { feature: "chef_chat", paid: await isPaid(ctx, "chef_chat"), wasPaid: (r) => r.source === "openai" },
      () =>
        validated(
          (repairHint) => port.chat({ ...input, repairHint }),
          (r) => r.reply,
          rules,
          () => heuristicRecipeChat.chat(input),
        ),
    );
    const charged = chargedFor(ctx, "chef_chat", result.source);
    const updated = await finishTurn(ctx.db, thread, userTurn, { text: result.reply, source: result.source, charged });
    return { reply: result.reply, source: result.source, thread: view(updated), credits: { charged } };
  } catch (err) {
    await dropTurn(ctx.db, userTurn.id).catch((e) => console.warn("[recipe-chat] drop turn failed", e));
    throw err;
  }
};
