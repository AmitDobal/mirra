/**
 * AMI-199: credits 200/month (free), mid-month top-up, token soft cap tied to credits, and an
 * explicit max_tokens + per-feature model on every OpenAI call. Runs against LOCAL D1.
 *   npm run db:migrate:local -w @mirra/api   # once
 *   npm run test:credits-tokens -w @mirra/api
 */
import { getPlatformProxy } from "wrangler";

import { createOpenAiCoachAdvisor } from "../src/adapters/openai-coach-advisor";
import { createOpenAiMealPlanGenerator } from "../src/adapters/openai-meal-plan-generator";
import { toCatalogRow, VETTED_FOODS } from "../src/data/vetted-foods";
import { createDb } from "../src/db";
import type { MirraEnv } from "../src/env";
import { AI_CALL_CONFIG, maxOutputTokensFor, openAiModelFor } from "../src/lib/ai/feature-config";
import { ABS_MONTHLY_CREDITS, DEFAULT_MONTHLY_GRANT, MONTHLY_ACTION_CAPS, periodOf, TOKENS_PER_CREDIT } from "../src/lib/ai-credits";
import { AI_QUOTAS } from "../src/lib/ai-quotas";
import { NO_DIET_CONSTRAINTS } from "../src/lib/diet-constraints";
import { getCredits } from "../src/services/credits";
import { applyCredit, ensurePeriod, raw } from "../src/services/credits-ledger";

let failures = 0;
const check = (ok: boolean, label: string, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `  - ${detail}`}`);
  if (!ok) failures += 1;
};

const pureCases = () => {
  check(DEFAULT_MONTHLY_GRANT.free === 200 && DEFAULT_MONTHLY_GRANT.pro === 400, "grant: free 200, pro 400");
  check(ABS_MONTHLY_CREDITS.free >= DEFAULT_MONTHLY_GRANT.free + 20, "absolute cap leaves room for the referral bonus");
  check((MONTHLY_ACTION_CAPS.free.meal_plan ?? 0) >= 30 && (MONTHLY_ACTION_CAPS.free.plan_gen ?? 0) >= 5, "free action caps allow a daily meal plan and weekly plans");
  check(AI_QUOTAS.free.monthlyTokens === 200 * TOKENS_PER_CREDIT && AI_QUOTAS.pro.monthlyTokens === 400 * TOKENS_PER_CREDIT, "token soft cap = credits x TOKENS_PER_CREDIT");
  check(Object.values(AI_CALL_CONFIG).every((c) => c.maxOutputTokens >= 200 && c.maxOutputTokens <= 4000), "every feature has a max_tokens cap");
  const env = { OPENAI_MODEL: "gpt-4.1-mini", OPENAI_MODEL_COACH: "gpt-4.1-nano" } as unknown as MirraEnv;
  check(openAiModelFor(env, "coach") === "gpt-4.1-nano" && openAiModelFor(env, "meal_plan") === "gpt-4.1-mini", "per-feature model env → OPENAI_MODEL fallback");
  check(openAiModelFor({} as MirraEnv, "chef_chat") === "gpt-4o-mini", "default model gpt-4o-mini");
};

const realFetch = globalThis.fetch;
const sent: Record<string, unknown>[] = [];
const mock = (content: string) => {
  globalThis.fetch = (async (_u: string, init?: { body?: string }) => {
    sent.push(JSON.parse(init?.body ?? "{}"));
    return new Response(JSON.stringify({ model: "mock-model", choices: [{ message: { content } }], usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 } }), { status: 200 });
  }) as typeof fetch;
};

const run = async () => {
  pureCases();
  const proxy = await getPlatformProxy<MirraEnv>({ configPath: "wrangler.jsonc" });
  const d1 = proxy.env.DB;
  const db = createDb(d1);
  const env = { ...proxy.env, OPENAI_API_KEY: "test", OPENAI_MODEL: "gpt-4o-mini", OPENAI_MODEL_COACH: "gpt-4.1-nano" } as MirraEnv;
  const user = `credits-${Date.now().toString(36)}`;
  const old = `credits-old-${Date.now().toString(36)}`;
  try {
    for (const u of [user, old]) await d1.prepare("INSERT INTO users (id) VALUES (?1)").bind(u).run();

    const fresh = await getCredits(db, env, user);
    check(fresh.granted === 200 && fresh.remaining === 200, `new free user gets 200 credits (${fresh.granted})`);

    // A period granted 40 before AMI-199 (old idempotency key) tops up to 200 exactly once.
    const period = periodOf();
    await raw(db).prepare("INSERT INTO ai_credit_periods (user_id, period, updated_at) VALUES (?1, ?2, ?3)").bind(old, period, Date.now()).run();
    await applyCredit(db, { userId: old, period, amount: 40, bucket: "granted", kind: "monthly_grant", idempotencyKey: `monthly_grant:${period}:free` });
    await ensurePeriod(db, env, old, "free", period);
    const again = await ensurePeriod(db, env, old, "free", period);
    check(again.granted === 200, `legacy 40-credit period topped up to 200 once (${again.granted})`);

    mock(JSON.stringify({ meals: [] }));
    const macros = { kcal: 2000, proteinG: 150, carbsG: 200, fatG: 60 };
    await createOpenAiMealPlanGenerator(env, db).generate({
      userId: user, date: "2026-11-06", targets: macros, remaining: macros, slots: ["lunch"],
      catalog: VETTED_FOODS.slice(0, 20).map(toCatalogRow), diet: NO_DIET_CONSTRAINTS, avoidFoodIds: [], recentFoodIds: [],
    });
    check(sent.at(-1)?.max_tokens === maxOutputTokensFor("meal_plan"), `meal_plan sends max_tokens ${maxOutputTokensFor("meal_plan")}`);

    mock(JSON.stringify({ message: "Nice work today.", rebuildSuggested: false }));
    await createOpenAiCoachAdvisor(env, db).advise({ userId: user, status: "done" });
    const coachReq = sent.at(-1);
    check(coachReq?.max_tokens === maxOutputTokensFor("coach") && coachReq?.model === "gpt-4.1-nano", "coach: max_tokens + OPENAI_MODEL_COACH");
    const usage = await d1
      .prepare("SELECT feature, prompt_tokens p, completion_tokens c FROM ai_usage_events WHERE user_id = ?1 ORDER BY created_at")
      .bind(user)
      .all<{ feature: string; p: number; c: number }>();
    const features = usage.results.map((r) => r.feature);
    check(features.includes("meal_plan") && features.includes("coach"), `ai_usage_events logs tokens per call incl. coach (${features.join(",")})`);
    check(usage.results.every((r) => r.p === 120 && r.c === 30), "prompt/completion tokens stored");
  } finally {
    globalThis.fetch = realFetch;
    for (const u of [user, old]) {
      for (const t of ["ai_usage_events", "ai_usage_daily", "ai_credit_ledger", "ai_credit_reservations", "ai_credit_periods"]) {
        await d1.prepare(`DELETE FROM ${t} WHERE user_id = ?1`).bind(u).run();
      }
      await d1.prepare("DELETE FROM users WHERE id = ?1").bind(u).run();
    }
    await proxy.dispose();
  }
  console.log(failures ? `assert-credits-tokens: ${failures} failed` : "assert-credits-tokens: all passed");
  if (failures) process.exit(1);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
