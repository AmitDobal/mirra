/**
 * AMI-184: OpenAI meal-plan output survives common slips (strict schema + repair). Offline.
 *   npm run test:meal-plan-repair -w @mirra/api
 */
import { createOpenAiMealPlanGenerator } from "../src/adapters/openai-meal-plan-generator";
import { mealPlanJsonSchema, repairMealDraft } from "../src/adapters/meal-plan-repair";
import { toCatalogRow, VETTED_FOODS } from "../src/data/vetted-foods";
import type { MirraEnv } from "../src/env";
import type { MealPlanInput } from "../src/ports/meal-plan-generator";
import { NO_DIET_CONSTRAINTS } from "../src/lib/diet-constraints";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const catalog = VETTED_FOODS.slice(0, 30).map(toCatalogRow);
const [a, b, c, avoided] = catalog;
const macros = { kcal: 2200, proteinG: 160, carbsG: 220, fatG: 70 };
const input: MealPlanInput = {
  userId: "u-meal",
  date: "2026-11-05",
  targets: macros,
  remaining: macros,
  slots: ["breakfast", "lunch", "dinner"],
  catalog,
  avoidFoodIds: [avoided!.id],
  recentFoodIds: [],
  diet: NO_DIET_CONSTRAINTS,
};

const repairCases = () => {
  const schema = mealPlanJsonSchema(input) as { properties: { meals: { items: { properties: Record<string, { enum?: string[]; items?: { properties: Record<string, { enum?: string[] }> } }> } } } };
  const meal = schema.properties.meals.items.properties;
  check(JSON.stringify(meal.slot!.enum) === '["breakfast","lunch","dinner"]', "schema: slot enum = requested slots");
  const ids = meal.items!.items!.properties.foodId!.enum!;
  check(ids.includes(a!.id) && !ids.includes(avoided!.id), "schema: foodId enum = catalog minus avoided");
  check(mealPlanJsonSchema({ ...input, catalog: [] }) === null, "schema: empty catalog → JSON mode");

  const raw = {
    meals: [
      { slot: "Breakfast", title: "Oats", items: [{ foodId: a!.id, grams: 80 }, { foodId: "made_up_food", grams: 50 }] },
      { slot: "lunch", title: "x".repeat(120), items: [{ foodId: b!.name, grams: "150" }, { foodId: b!.id.toUpperCase(), grams: 50 }] },
      { slot: "lunch", title: "Second lunch", items: [{ foodId: c!.id, grams: 100 }] },
      { slot: "snacks", title: "Not asked", items: [{ foodId: c!.id, grams: 30 }] },
      { slot: "dinner", title: "Avoided only", items: [{ foodId: avoided!.id, grams: 200 }] },
    ],
  };
  const r = repairMealDraft(raw, input);
  check(r.meals.length === 2, `kept 2 valid meals (${r.meals.map((m) => m.slot)})`);
  check(r.meals[0]!.slot === "breakfast" && r.meals[0]!.items.length === 1, "slot case fixed, unknown foodId dropped");
  check(r.meals[1]!.items.length === 1 && r.meals[1]!.items[0]!.foodId === b!.id && r.meals[1]!.items[0]!.grams === 200, "name/case ids resolved, string grams parsed, duplicates merged");
  check(r.meals[1]!.title.length === 80, "long title truncated");
  check(JSON.stringify(r.missingSlots) === '["dinner"]', "avoided-only dinner left for the per-slot fallback");
  check(r.fixes.some((f) => f.includes("repeat lunch")) && r.fixes.some((f) => f.includes('"snacks"')), `fixes logged (${r.fixes.join("; ")})`);
  check(repairMealDraft({ meals: [{ slot: "lunch", items: Array.from({ length: 9 }, (_, i) => ({ foodId: catalog[i + 4]!.id, grams: 50 })) }] }, input).meals[0]!.items.length === 6, "items capped at 6");
  check(repairMealDraft({}, input).meals.length === 0, "no meals array → nothing kept");
};

type Sent = { response_format?: { type: string; json_schema?: { strict: boolean } } };
let sent: Sent = {};
let reply = "{}";
globalThis.fetch = (async (_url: string, init: { body: string }) => {
  sent = JSON.parse(init.body) as Sent;
  return new Response(JSON.stringify({ model: "stub", choices: [{ message: { content: reply } }] }), { status: 200 });
}) as unknown as typeof fetch;

const adapterCases = async () => {
  const gen = createOpenAiMealPlanGenerator({ OPENAI_API_KEY: "stub" } as unknown as MirraEnv);
  reply = JSON.stringify({
    meals: [
      { slot: "breakfast", title: "Oats", items: [{ foodId: a!.id, grams: 80 }] },
      { slot: "lunch", title: "Bowl", items: [{ foodId: "hallucinated", grams: 100 }, { foodId: b!.id, grams: 150 }] },
    ],
  });
  const out = await gen.generate(input);
  check(sent.response_format?.type === "json_schema" && sent.response_format.json_schema?.strict === true, "request uses strict json_schema");
  check(out.source === "openai" && out.meals.length === 2, `one bad item + missing dinner → AI meals kept (${out.source}, ${out.meals.length})`);
  reply = JSON.stringify({ meals: [{ slot: "lunch", title: "Bad", items: [{ foodId: "nope", grams: 100 }] }] });
  check((await gen.generate(input)).source === "heuristic", "nothing salvageable → heuristic");
};

const main = async () => {
  repairCases();
  await adapterCases();
  if (failures) {
    console.error(`\n${failures} failed`);
    process.exit(1);
  }
  console.log("\nassert-meal-plan-repair: all passed");
};

void main();
