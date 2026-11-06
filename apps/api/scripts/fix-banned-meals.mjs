#!/usr/bin/env node
/**
 * AMI-199 data fix: find current/future PLANNED meals that break each user's diet constraints
 * (e.g. beef for an Indian-cuisine user) and re-draft just those meals with the free heuristic
 * planner (same macros budget, allowed catalog only, diet guard applied). Logged/skipped meals
 * are never touched. No AI calls, no credits.
 *
 * DRY RUN by default (prints counts only, writes nothing):
 *   node scripts/fix-banned-meals.mjs                 # local D1
 *   node scripts/fix-banned-meals.mjs --remote        # production D1 (read-only dry run)
 * Apply (release agent, with approval):
 *   node scripts/fix-banned-meals.mjs --remote --apply
 * Options: --since=YYYY-MM-DD (default: yesterday UTC, so every timezone's "today" is covered)
 *          --user=<userId>   limit to one user
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { tsImport } from "tsx/esm/api";

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = join(here, "..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const target = flag("remote") ? "--remote" : "--local";
const apply = flag("apply");
const since = opt("since") ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const onlyUser = opt("user");
if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`bad --since ${since}`);
if (onlyUser && !/^[\w-]+$/.test(onlyUser)) throw new Error("bad --user");

const load = (p) => tsImport(p, import.meta.url);
const { FOODS_BY_ID, toCatalogRow } = await load("../src/data/vetted-foods.ts");
const { findBannedTerm, foodBannedBy } = await load("../src/lib/diet-constraints.ts");
const { dietCatalog } = await load("../src/lib/meal-diet.ts");
const { materializeDrafts, itemValues } = await load("../src/services/meal-plan-draft.ts");

const d1 = (extra) => {
  const out = execFileSync("npx", ["wrangler", "d1", "execute", "mirra-db", target, "--json", ...extra], {
    cwd: apiDir,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return JSON.parse(out);
};

const SELECT = `SELECT i.id, i.slot, i.title, i.items_json, i.kcal, i.protein_g, i.carbs_g, i.fat_g,
  d.local_date, d.user_id, d.targets_json,
  p.diet_tags_json, p.foods_avoid, p.cuisine_json, p.lifestyle_notes, pr.timezone
FROM meal_plan_items i
JOIN meal_plan_days d ON d.id = i.day_id
LEFT JOIN preferences p ON p.user_id = d.user_id
LEFT JOIN profiles pr ON pr.user_id = d.user_id
WHERE i.status = 'planned' AND d.local_date >= '${since}'${onlyUser ? ` AND d.user_id = '${onlyUser}'` : ""}`;

const parse = (s, fallback) => {
  try {
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

const violationOf = (row, constraints) => {
  const items = parse(row.items_json, []);
  for (const it of items) {
    const food = FOODS_BY_ID.get(it.foodId);
    const why = food ? foodBannedBy(food, constraints) : null;
    if (why) return `food:${it.foodId}(${why})`;
  }
  const names = items.map((it) => FOODS_BY_ID.get(it.foodId)?.name).filter(Boolean);
  const term = findBannedTerm(row.title, constraints, names);
  return term ? `title:${term}` : null;
};

const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);

const main = async () => {
  const rows = d1(["--command", SELECT])[0]?.results ?? [];
  const stats = { scanned: rows.length, violating: 0, users: new Set(), reasons: {}, redrafted: 0, noAlternative: 0 };
  const updates = [];
  for (const row of rows) {
    const cuisineStyles = parse(row.cuisine_json, []);
    const { constraints, foods } = dietCatalog({
      dietTags: parse(row.diet_tags_json, []),
      foodsAvoid: row.foods_avoid,
      cuisineStyles,
      hintText: row.lifestyle_notes,
      timezone: row.timezone,
    });
    const why = violationOf(row, constraints);
    if (!why) continue;
    stats.violating += 1;
    stats.users.add(row.user_id);
    const key = why.split("(")[0];
    stats.reasons[key] = (stats.reasons[key] ?? 0) + 1;
    const budget = { kcal: row.kcal, proteinG: row.protein_g, carbsG: row.carbs_g, fatG: row.fat_g };
    const { meals } = await materializeDrafts({
      userId: row.user_id,
      date: row.local_date,
      targets: parse(row.targets_json, budget),
      remaining: budget,
      slots: [row.slot],
      catalog: foods.map(toCatalogRow),
      diet: constraints,
      avoidFoodIds: parse(row.items_json, []).map((i) => i.foodId),
      recentFoodIds: [],
      seed: `ami-199-fix|${row.id}`,
    });
    const drafted = meals.get(row.slot);
    if (!drafted) {
      stats.noAlternative += 1;
      continue;
    }
    stats.redrafted += 1;
    const v = itemValues(drafted);
    updates.push(
      `UPDATE meal_plan_items SET title = ${sqlStr(v.title)}, items_json = ${sqlStr(v.itemsJson)}, kcal = ${v.kcal}, ` +
        `protein_g = ${v.proteinG}, carbs_g = ${v.carbsG}, fat_g = ${v.fatG}, fit = ${sqlStr(v.fit)}, updated_at = ${Date.now()} ` +
        `WHERE id = ${sqlStr(row.id)} AND status = 'planned';`,
    );
  }

  console.log(`[fix-banned-meals] ${target} since ${since}${apply ? " APPLY" : " (dry run)"}`);
  console.log(`  planned meals scanned : ${stats.scanned}`);
  console.log(`  violating             : ${stats.violating} across ${stats.users.size} users`);
  console.log(`  by reason             : ${JSON.stringify(stats.reasons)}`);
  console.log(`  re-drafted            : ${stats.redrafted}  (no safe alternative: ${stats.noAlternative})`);
  if (!apply) {
    if (updates.length > 0) console.log("  dry run: nothing written. Re-run with --apply to update these meals.");
    return;
  }
  if (updates.length === 0) return console.log("  nothing to write.");
  const dir = mkdtempSync(join(tmpdir(), "fix-banned-meals-"));
  const file = join(dir, "fix.sql");
  try {
    writeFileSync(file, updates.join("\n"));
    d1(["--file", file, "--yes"]);
    console.log(`  applied ${updates.length} updates.`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

main().catch((err) => {
  console.error("[fix-banned-meals] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
