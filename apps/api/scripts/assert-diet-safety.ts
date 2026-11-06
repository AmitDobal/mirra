/**
 * AMI-199: diet safety guard. A user with Indian cuisine was served beef. Offline (in-memory D1,
 * all migrations; OpenAI mocked by stubbing fetch).
 *   npm run test:diet-safety -w @mirra/api
 */
import { CUISINE_STYLE_IDS, type ContextEnvelope } from "@mirra/contracts";
import { eq } from "drizzle-orm";

import { seedHeuristicMealPicks } from "../src/adapters/heuristic-meal-plan-generator";
import { FOODS_BY_ID, toCatalogRow, VETTED_FOODS } from "../src/data/vetted-foods";
import * as schema from "../src/db/schema";
import type { MirraEnv } from "../src/env";
import { findBannedTerm, resolveDietConstraints } from "../src/lib/diet-constraints";
import { guardMealDraft } from "../src/lib/diet-guard";
import { ApiError } from "../src/lib/errors";
import { newId } from "../src/lib/id";
import { dietCatalog } from "../src/lib/meal-diet";
import { generatePlan, getTodayPlan } from "../src/services/meal-plan";
import { materializeDrafts } from "../src/services/meal-plan-draft";
import { getRecipeDetail, sendChefMessage } from "../src/services/recipe-chat";
import { buildSafetyRules, findForbiddenTerm, findRequestedViolation } from "../src/services/recipe-safety-policy";
import { DIET_SAFE_REPLY, dietSafeReply } from "../src/services/revise/diet-reply";
import { applyDraft, revisePlans } from "../src/services/plan-revise";
import type { ReviseState } from "../src/services/revise/context";
import { createMemoryDb } from "./lib/memory-d1";

let failures = 0;
let passes = 0;
const check = (ok: boolean, label: string, detail = "") => {
  if (ok) passes += 1;
  else console.log(`FAIL  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const say = (ok: boolean, label: string, detail = "") => {
  check(ok, label, detail);
  if (ok) console.log(`PASS  ${label}`);
};

const macros = { kcal: 2300, proteinG: 170, carbsG: 230, fatG: 75 };
const SLOTS = ["breakfast", "lunch", "snack", "dinner"] as const;

/** Independent oracle: catalog tags each diet / cuisine must never serve. */
const EXPECT: Record<string, string[]> = {
  "": [],
  vegetarian: ["meat", "fish", "shellfish"],
  eggetarian: ["meat", "fish", "shellfish"],
  vegan: ["meat", "fish", "shellfish", "egg", "dairy"],
  pescatarian: ["meat"],
  halal: ["pork"],
  kosher: ["pork", "shellfish"],
  jain: ["meat", "fish", "shellfish", "egg", "root_veg", "fungi"],
  no_beef: ["beef"],
  no_pork: ["pork"],
  dairy_free: ["dairy"],
  gluten_free: ["gluten"],
};
const CUISINE_EXPECT: Record<string, string[]> = { indian: ["beef", "pork"], middle_eastern: ["pork"] };

const offending = (foodIds: string[], tags: string[]) =>
  foodIds.filter((id) => FOODS_BY_ID.get(id)?.tags.some((t) => tags.includes(t)));

// --- 1. table: cuisines x diets, heuristic generations ------------------------------------
const tableCases = async () => {
  let combos = 0;
  let meals = 0;
  for (const cuisine of CUISINE_STYLE_IDS) {
    for (const diet of Object.keys(EXPECT)) {
      const { constraints, foods } = dietCatalog({ dietTags: diet ? [diet] : [], cuisineStyles: [cuisine] });
      const banned = [...EXPECT[diet]!, ...(CUISINE_EXPECT[cuisine] ?? [])];
      check(offending(foods.map((f) => f.id), banned).length === 0, `catalog ${cuisine}/${diet || "none"} has no ${banned}`);
      if (foods.length === 0) continue;
      combos += 1;
      for (let i = 0; i < 10; i++) {
        seedHeuristicMealPicks(`${cuisine}|${diet}|${i}`);
        const { meals: out } = await materializeDrafts({
          userId: "u", date: "2026-11-06", targets: macros, remaining: macros, slots: [...SLOTS],
          catalog: foods.map(toCatalogRow), diet: constraints, avoidFoodIds: [], recentFoodIds: [],
        });
        for (const m of out.values()) {
          meals += 1;
          const ids = m.meal.items.map((it) => it.foodId);
          check(offending(ids, banned).length === 0, `${cuisine}/${diet}: ${m.title}`, ids.join(","));
          check(findBannedTerm(m.title, constraints) === null, `${cuisine}/${diet} title: ${m.title}`);
        }
      }
    }
  }
  seedHeuristicMealPicks(null);
  say(combos >= 90 && meals > 3000, `table: ${combos} cuisine x diet combos, ${meals} heuristic meals, none banned`);
};

// --- 2. Indian user: 200 seeded heuristic days, even with an UNFILTERED catalog -------------
const indianCases = async () => {
  const diet = resolveDietConstraints({ dietTags: [], cuisineStyles: ["indian"] });
  say(diet.groups.includes("beef") && diet.groups.includes("pork"), "indian cuisine → beef + pork banned by default");
  const raw = VETTED_FOODS.map(toCatalogRow); // simulates a caller that forgot to filter
  let beef = 0;
  for (let i = 0; i < 200; i++) {
    seedHeuristicMealPicks(`indian-${i}`);
    const { meals } = await materializeDrafts({
      userId: "u", date: "2026-11-06", targets: macros, remaining: macros, slots: [...SLOTS],
      catalog: raw, diet, avoidFoodIds: [], recentFoodIds: [],
    });
    for (const m of meals.values()) {
      if (offending(m.meal.items.map((x) => x.foodId), ["beef", "pork"]).length > 0 || findBannedTerm(m.title, diet)) beef++;
    }
  }
  seedHeuristicMealPicks(null);
  say(beef === 0, `indian: 200 seeded heuristic days (unfiltered catalog) → 0 beef/pork (${beef})`);
  const tz = resolveDietConstraints({ dietTags: [], cuisineStyles: ["american"], timezone: "Asia/Kolkata" });
  say(tz.groups.includes("beef"), "Asia/Kolkata timezone → beef banned (locale default)");
  const us = resolveDietConstraints({ dietTags: [], cuisineStyles: ["american"], timezone: "America/New_York" });
  say(us.groups.length === 0, "american + US timezone → no default bans");
  const mixed = resolveDietConstraints({ dietTags: [], cuisineStyles: ["indian", "american"] });
  say(mixed.groups.includes("beef"), "indian + american → beef still banned (conservative union)");
  const other = resolveDietConstraints({ dietTags: [], cuisineStyles: ["other"], hintText: "I love dal and curry" });
  say(other.groups.includes("beef"), "other + Indian hints in notes → beef banned");
};

// --- 3. synonyms ----------------------------------------------------------------------------
const synonymCases = () => {
  const indian = resolveDietConstraints({ dietTags: [], cuisineStyles: ["indian"] });
  const banned = [
    "Steak and rice", "Veal cutlet", "Brisket bowl", "Ground beef tacos", "Beef burger", "Burger patty with fries",
    "Oxtail stew", "Bresaola salad", "Pastrami sandwich", "Corned beef hash", "Pepperoni pizza", "Ham sandwich",
    "Bacon and eggs", "Pork belly", "Fried in lard", "Gelatin dessert", "Sausage roll", "Hamburger", "Meatballs",
    "Beef bulgogi", "Pulled pork", "Chorizo eggs", "Prosciutto melon", "Salami", "Spare ribs", "Sirloin",
  ];
  const missed = banned.filter((t) => findBannedTerm(t, indian) === null);
  say(missed.length === 0, `indian: ${banned.length} beef/pork synonyms caught`, missed.join(" | "));
  const fine = [
    "Chicken burger", "Veggie burger with rice", "Chicken sausage omelette", "Paneer tikka", "Graham crackers",
    "Chicken breast with lentils", "Oats with peanut butter", "Tofu patty", "Lentil meatballs", "Shampoo",
  ];
  const wrong = fine.filter((t) => findBannedTerm(t, indian) !== null);
  say(wrong.length === 0, `indian: ${fine.length} safe titles not flagged`, wrong.map((t) => `${t}:${findBannedTerm(t, indian)}`).join(" | "));
  const df = resolveDietConstraints({ dietTags: ["dairy_free"], cuisineStyles: ["american"] });
  say(findBannedTerm("Toast with peanut butter and almond milk", df) === null && findBannedTerm("Cheese omelette", df) === "cheese", "dairy-free: peanut butter / almond milk ok, cheese caught");
  const nut = resolveDietConstraints({ dietTags: [], foodsAvoid: "peanuts", cuisineStyles: ["american"] });
  say(findBannedTerm("Toast with peanut butter", nut) === "peanut", "nut avoid: peanut butter caught");
  const avoid = resolveDietConstraints({ dietTags: [], foodsAvoid: "no beef and pork please", cuisineStyles: ["american"] });
  say(avoid.groups.includes("beef") && avoid.groups.includes("pork") && findBannedTerm("Chicken and rice", avoid) === null, "free-text 'no beef and pork' → groups, filler words never banned");
};

// --- 4. guard: an AI draft with beef is repaired ---------------------------------------------
const guardCases = () => {
  const diet = resolveDietConstraints({ dietTags: [], cuisineStyles: ["indian"] });
  const r = guardMealDraft(
    { slot: "dinner" as const, title: "Beef steak with rice", items: [{ foodId: "lean_beef_cooked", grams: 150 }, { foodId: "white_rice_cooked", grams: 200 }, { foodId: "broccoli_cooked", grams: 100 }] },
    diet,
  );
  say(r.meal === null && r.fixes.some((f) => f.includes("lean_beef_cooked")), "guard: dish holding beef rejected → slot re-drafted");
  const t = guardMealDraft({ slot: "dinner" as const, title: "Steak-style chicken bowl", items: [{ foodId: "chicken_breast_cooked", grams: 150 }, { foodId: "white_rice_cooked", grams: 200 }] }, diet);
  say(t.meal !== null && !/steak/i.test(t.meal.title), `guard: safe items, banned title word → title rebuilt (${t.meal?.title})`);
  const only = guardMealDraft({ slot: "lunch" as const, title: "Lean beef", items: [{ foodId: "lean_beef_cooked", grams: 150 }] }, diet);
  say(only.meal === null, "guard: beef-only meal rejected (slot re-drafted)");
};

// --- in-memory D1 user ----------------------------------------------------------------------
const { db, sqlite } = createMemoryDb();
const today = new Date().toISOString().slice(0, 10);
const seedUser = async (env: MirraEnv, prefs: { cuisine: string[]; diet?: string[] }) => {
  const userId = newId();
  await db.insert(schema.users).values({ id: userId });
  await db.insert(schema.profiles).values({ userId, timezone: "UTC" });
  await db.insert(schema.preferences).values({
    userId, primaryGoal: "build_muscle", experience: "months", equipmentJson: '["full_gym"]',
    cuisineJson: JSON.stringify(prefs.cuisine), dietTagsJson: JSON.stringify(prefs.diet ?? []),
  });
  await db.insert(schema.plans).values({
    id: newId(), userId, version: 1, status: "ready", weekStart: today, source: "heuristic",
    summaryJson: JSON.stringify({ kcalTarget: 2400, proteinG: 170, carbsG: 250, fatG: 75 }),
  });
  return { env, db, userId };
};

const realFetch = globalThis.fetch;
const mockOpenAi = (content: (body: { messages: { content: string }[]; response_format?: { type: string } }) => string) => {
  const sent: string[] = [];
  globalThis.fetch = (async (_url: string, init?: { body?: string }) => {
    const body = JSON.parse(init?.body ?? "{}");
    sent.push(JSON.stringify(body.messages));
    return new Response(JSON.stringify({ model: "mock", choices: [{ message: { content: content(body) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } }), { status: 200 });
  }) as typeof fetch;
  return sent;
};

const beefDraft = JSON.stringify({
  meals: SLOTS.map((slot) => ({ slot, title: "Beef steak power bowl", items: [{ foodId: "lean_beef_cooked", grams: 160 }, { foodId: "white_rice_cooked", grams: 180 }, { foodId: "spinach_raw", grams: 60 }] })),
});

const openAiCases = async () => {
  const env = { AI_PROVIDER: "openai", OPENAI_API_KEY: "test", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
  const warn = console.warn;
  const logs: string[] = [];
  console.warn = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
  const sent = mockOpenAi(() => beefDraft);
  try {
    const ctx = await seedUser(env, { cuisine: ["indian"] });
    const plan = await generatePlan(ctx, { date: today });
    const ids = plan.meals.flatMap((m) => m.items.map((i) => i.foodId));
    say(plan.meals.length > 0 && !ids.includes("lean_beef_cooked"), `mocked OpenAI returns beef → stored plan has none (${plan.meals.map((m) => m.title).join(" | ")})`);
    say(plan.meals.every((m) => !/beef|steak/i.test(m.title)), "mocked OpenAI beef titles rewritten");
    say(logs.some((l) => l.includes("[diet-guard]")), "[diet-guard] logged");
    say(sent.some((s) => s.includes("neverInclude") && s.includes("beef") && s.includes("allowedProteins")), "prompt carries diet.neverInclude (beef) + allowedProteins");
    say(!sent.some((s) => s.includes("lean_beef_cooked")), "prompt catalog has no beef id");
  } finally {
    console.warn = warn;
    globalThis.fetch = realFetch;
  }
};

const chefCases = async () => {
  const env = { AI_PROVIDER: "openai", OPENAI_API_KEY: "test", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
  const envelope = { hardConstraints: [{ type: "cuisine_only", value: "indian", source: "user_setting" }] } as unknown as ContextEnvelope;
  const rules = buildSafetyRules(envelope, ["chicken breast", "white rice"]);
  say(findForbiddenTerm("Try a seared steak instead of chicken.", rules) === "steak", "chef: steak in a reply is caught");
  say(findRequestedViolation("make me a high protein dinner with beef", rules) === "beef", "chef: asking for beef → 422 term");
  say(buildSafetyRules(envelope, ["lean beef", "white rice"]).mealViolation === "beef", "chef: legacy beef meal flagged even though it is in the meal");

  const heur = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
  const ctx = await seedUser(heur, { cuisine: ["indian"] });
  const plan = await generatePlan(ctx, { date: today });
  const dinner = plan.meals.find((m) => m.slot === "dinner") ?? plan.meals[0]!;
  const steak = mockOpenAi(() => "Swap the chicken for a juicy steak and some bacon for more protein.");
  try {
    const out = await sendChefMessage({ ...ctx, env, forceHeuristic: false }, { mealId: dinner.id, message: "make me a high protein dinner" });
    say(!/steak|bacon|beef|pork/i.test(out.reply) && out.source === "heuristic", `chef: OpenAI steak reply refused → heuristic (${out.reply.slice(0, 70)})`);
    say(steak.length === 2, "chef: one repair retry before fallback");
  } finally {
    globalThis.fetch = realFetch;
  }
  // A legacy row from before the fix: beef in a planned meal.
  const lunch = plan.meals.find((m) => m.slot === "lunch")!;
  await db.update(schema.mealPlanItems).set({ title: "Lean beef with rice", itemsJson: JSON.stringify([{ foodId: "lean_beef_cooked", name: "Lean beef", grams: 150, unitLabel: "1 palm" }]) }).where(eq(schema.mealPlanItems.id, lunch.id));
  const detail = await getRecipeDetail({ ...ctx, forceHeuristic: true }, lunch.id);
  say(!detail.recipe.steps.join(" ").toLowerCase().includes("beef"), "chef: legacy beef meal recipe has no beef steps");
  let code = "";
  try {
    await sendChefMessage({ ...ctx, forceHeuristic: true }, { mealId: lunch.id, message: "how do I cook it" });
  } catch (err) {
    code = err instanceof ApiError ? `${err.status}:${err.code}` : String(err);
  }
  say(code === "422:constraint_violation", `chef: chat on legacy beef meal → 422 (${code})`);
};

const planChatCases = async () => {
  const env = { AI_PROVIDER: "heuristic", AI_CREDITS_MODE: "off" } as unknown as MirraEnv;
  let beef = 0;
  for (let i = 0; i < 10; i++) {
    const ctx = await seedUser(env, { cuisine: ["indian"] });
    await generatePlan(ctx, { date: today });
    const res = await revisePlans(ctx, { message: "swap my lunch for more protein", scope: "auto", date: today, dryRun: true });
    if (res.draftId) await applyDraft(ctx, res.draftId);
    const after = await getTodayPlan(ctx, today);
    for (const m of after?.meals ?? []) if (m.items.some((x) => x.foodId === "lean_beef_cooked") || /beef|steak|pork/i.test(m.title)) beef++;
  }
  say(beef === 0, `plan chat: 10 Indian users swap lunch → 0 beef/pork (${beef})`);
  const state = { dietTags: [], foodsAvoid: null, cuisineStyles: ["indian"], prefs: undefined } as unknown as ReviseState;
  say(dietSafeReply("Swapping your lunch for steak and rice.", state, "UTC") === DIET_SAFE_REPLY, "plan chat: reviser reply naming steak → neutral line");
  say(dietSafeReply("Swapped lunch for a chicken bowl.", state, "UTC") !== DIET_SAFE_REPLY, "plan chat: safe reply kept");
};

const main = async () => {
  await tableCases();
  await indianCases();
  synonymCases();
  guardCases();
  await openAiCases();
  await chefCases();
  await planChatCases();
  sqlite.close();
  console.log(failures ? `assert-diet-safety: ${failures} failed, ${passes} passed` : `assert-diet-safety: all ${passes} passed`);
  if (failures) process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
