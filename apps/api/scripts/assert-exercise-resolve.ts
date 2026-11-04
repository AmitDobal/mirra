/**
 * Offline assertions for the exercise library, name resolver and ExerciseTagger fallback (AMI-161).
 *   npm run test:exercise-resolve -w @mirra/api
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MuscleIdSchema } from "@mirra/contracts";

import { EXERCISE_LIBRARY } from "../src/data/exercises";
import type { MirraEnv } from "../src/env";
import {
  ANCHOR_IDS,
  gearFitsEntry,
  libraryEntry,
  libraryIndex,
  matchExerciseName,
  normalize,
  normalizeVariants,
} from "../src/lib/exercise-library";
import { getExerciseTagger } from "../src/lib/exercise-tagger";
import { SWAP_MAP } from "../src/services/workout-swaps";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const here = dirname(fileURLToPath(import.meta.url));
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

// ── Library integrity ──────────────────────────────────────────────────────
const anchors = new Set<string>(ANCHOR_IDS);
const badEntries: string[] = [];
for (const e of EXERCISE_LIBRARY) {
  const total = e.muscles.reduce((s, m) => s + m.pct, 0);
  if (total !== 100) badEntries.push(`${e.id} sums to ${total}`);
  if (e.muscles.some((m) => !MuscleIdSchema.safeParse(m.id).success || m.pct <= 0)) {
    badEntries.push(`${e.id} has a bad muscle row`);
  }
  if (new Set(e.muscles.map((m) => m.id)).size !== e.muscles.length) badEntries.push(`${e.id} repeats a muscle`);
  const std = e.standard;
  if (std && "anchor" in std && (!anchors.has(std.anchor) || std.anchor !== e.id)) {
    badEntries.push(`${e.id} anchor ${std.anchor}`);
  }
  if (std && "parent" in std && (!anchors.has(std.parent) || !(std.ratio > 0))) {
    badEntries.push(`${e.id} parent ${std.parent}`);
  }
  if (e.bwFactor != null && e.scoring !== "bodyweight") badEntries.push(`${e.id} bwFactor on non-bodyweight`);
}
check(badEntries.length === 0, `every library entry sums to 100 with valid muscles and standards ${badEntries.join("; ")}`);
check(EXERCISE_LIBRARY.length >= 120, `library has ≥120 entries (${EXERCISE_LIBRARY.length})`);
check(
  ANCHOR_IDS.every((a) => libraryEntry(a)?.standard && "anchor" in libraryEntry(a)!.standard!),
  "every anchor id is a library entry with its own standard",
);
check(libraryIndex().collisions.length === 0, `no alias collisions ${libraryIndex().collisions.join("; ")}`);
const bw = (id: string) => libraryEntry(id)?.bwFactor;
check(
  bw("pull_up") === 1 && bw("chin_up") === 1 && bw("triceps_dip") === 0.95 && bw("inverted_row") === 0.6 && bw("push_up") === 0.65,
  "bwFactor per arch §3",
);
for (const file of ["push", "pull", "legs", "core", "index"]) {
  const lines = readFileSync(join(here, `../src/data/exercises/${file}.ts`), "utf8").split("\n").length;
  check(lines <= 300, `data/exercises/${file}.ts ≤300 lines (${lines})`);
}

// ── normalize() ────────────────────────────────────────────────────────────
check(normalize("Incline DB Presses") === "incline dumbbell press", "normalize expands db + singularizes");
check(normalize("Tricep Dips (Chair)") === "tricep dip", "normalize drops parenthetical");
check(normalize("Bodyweight Squats") === "bodyweight squat", "normalize singular squats");
check(normalize("Resistance Band Pull-Aparts") === "band pull apart", "normalize folds resistance band");
check(normalize("Lat pull-down") === "lat pulldown", "normalize folds pull down");
check(normalize("Atlas Stone Loads") === "atlas stone load", "normalize keeps -as words");
check(normalize("Push-Ups") === "push up", "normalize push-ups");
check(normalizeVariants("Push-Ups (Knees)")[0] === "push up knee", "variants keep parenthetical words first");
check(normalizeVariants("Pull-up (or doorway row)").every((v) => !v.includes("doorway")), "variants drop (or …)");

// ── Known mappings ─────────────────────────────────────────────────────────
const expectId = (name: string, id: string | null) => {
  const got = matchExerciseName(name)?.entry.id ?? null;
  check(got === id, `"${name}" → ${id ?? "no library hit"} (got ${got})`);
};
expectId("Incline DB press", "incline_dumbbell_press");
expectId("Tricep dips", "triceps_dip");
expectId("bench_press", "bench_press");
expectId("Barbell Bent-Over Row", "barbell_row");
expectId("Bent Over Dumbbell Rows", "dumbbell_row");
expectId("Push-Ups (Knees)", "knee_push_up");
expectId("Seated Cable Rows", "cable_row");
expectId("RDL", "romanian_deadlift");
expectId("Leg Press Machine", "leg_press");
// Equipment safety: never cross gear.
const neverId = (name: string, id: string) => {
  const got = matchExerciseName(name)?.entry.id ?? null;
  check(got !== id, `"${name}" never maps to ${id} (got ${got})`);
};
neverId("dumbbell row", "barbell_row");
neverId("Dumbbell Bent-Over Row", "barbell_row");
neverId("Cable squat", "back_squat");
neverId("Bodyweight squat", "back_squat");
neverId("Kettlebell overhead press", "overhead_press");
neverId("Dumbbell bench press", "bench_press");
neverId("Band row", "barbell_row");
check(matchExerciseName("Kettlebell Halo Twirl") === null, "unknown lift misses the library");

// ── Source names: 100% without the tagger ──────────────────────────────────
type CatalogRow = { name: string };
const catalog = readJson<CatalogRow[]>(join(here, "../../mobile/src/content/exercise-catalog.json"));
const swapNames = Object.values(SWAP_MAP).flatMap((rules) => rules.flatMap((r) => Object.values(r.to)));
const sourceNames = [
  ...readJson<string[]>(join(here, "fixtures/source-exercise-names.json")),
  ...swapNames,
  ...catalog.map((c) => c.name),
];
const sourceMiss = [...new Set(sourceNames)].filter((n) => !matchExerciseName(n));
check(sourceMiss.length === 0, `every generator / tuning / swap / mobile catalog name resolves (${sourceMiss.join(", ")})`);

// ── AI fixture: ≥95% without the tagger, zero gear crossings ───────────────
const aiNames = readJson<string[]>(join(here, "fixtures/ai-plan-exercise-names.json"));
check(aiNames.length >= 100, `fixture has ≥100 AI plan names (${aiNames.length})`);
const aiMiss = aiNames.filter((n) => !matchExerciseName(n));
const rate = (aiNames.length - aiMiss.length) / aiNames.length;
check(rate >= 0.95, `AI fixture resolves ${(rate * 100).toFixed(1)}% without tagger (misses: ${aiMiss.join(", ")})`);
const crossed = [...new Set([...aiNames, ...sourceNames])].filter((n) => {
  const hit = matchExerciseName(n);
  return hit != null && !gearFitsEntry(n, hit.entry);
});
check(crossed.length === 0, `zero equipment cross-matches (${crossed.join(", ")})`);

// ── ExerciseTagger fallback ────────────────────────────────────────────────
const run = async () => {
  const lib = EXERCISE_LIBRARY.slice(0, 3).map((e) => ({ id: e.id, name: e.name }));
  const noKey = getExerciseTagger({ AI_PROVIDER: "" } as MirraEnv);
  check(noKey.provider === "heuristic", "no key → heuristic tagger");
  const hTags = await noKey.tag({ names: aiMiss.length ? aiMiss : ["Foam Rolling"], library: lib });
  check(
    hTags.every((t) => t.source === "heuristic" && t.muscles.length > 0 && t.muscles.reduce((s, m) => s + m.pct, 0) === 100),
    "heuristic tags are non-empty and sum to 100",
  );

  const realFetch = globalThis.fetch;
  let sentStrict = false;
  const fakeReply = (content: unknown) =>
    (async (_url: unknown, init?: { body?: string }) => {
      const body = JSON.parse(init?.body ?? "{}") as { response_format?: { json_schema?: { strict?: boolean } } };
      sentStrict = body.response_format?.json_schema?.strict === true;
      return new Response(
        JSON.stringify({ model: "gpt-4o-mini", choices: [{ message: { content: JSON.stringify(content) } }] }),
        { status: 200 },
      );
    }) as typeof fetch;
  const env = { AI_PROVIDER: "openai", OPENAI_API_KEY: "test-key" } as MirraEnv;
  const names = ["Zercher Hold", "Pec Smash", "Sled Push"];
  globalThis.fetch = fakeReply({
    items: [
      { name: "Zercher Hold", canonicalId: null, muscles: [{ id: "abs", pct: 60 }, { id: "quads", pct: 40 }], scoring: "time", pattern: "core" },
      { name: "Pec Smash", canonicalId: null, muscles: [{ id: "pecs", pct: 100 }], scoring: "load", pattern: "push" },
      { name: "Sled Push", canonicalId: null, muscles: [{ id: "quads", pct: 50 }, { id: "glutes", pct: 30 }], scoring: "load", pattern: "legs" },
    ],
  });
  const ai = getExerciseTagger(env);
  check(ai.provider === "ai", "key → AI tagger");
  const tags = await ai.tag({ names, library: lib });
  const by = new Map(tags.map((t) => [t.name, t]));
  check(sentStrict, "OpenAI adapter sends strict json_schema");
  check(by.get("Zercher Hold")?.source === "ai", "valid AI tag kept");
  check(by.get("Pec Smash")?.source === "heuristic", "unknown muscle id → heuristic fallback");
  check(by.get("Sled Push")?.source === "heuristic", "pcts not 100 ±2 → heuristic fallback");
  check(tags.length === names.length, "one tag per name");

  globalThis.fetch = (async () => new Response("{}", { status: 500 })) as typeof fetch;
  const failed = await getExerciseTagger(env).tag({ names, library: lib });
  check(failed.every((t) => t.source === "heuristic"), "API error → heuristic for every name");
  globalThis.fetch = realFetch;

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nPASS exercise-resolve");
};

void run();
