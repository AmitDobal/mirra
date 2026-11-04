import type { ExerciseMuscle, ExerciseSource, MuscleId } from "@mirra/contracts";
import { inArray, sql } from "drizzle-orm";

import { EXERCISE_LIBRARY } from "../data/exercises";
import type { AppDB } from "../db";
import { exerciseTags } from "../db/schema";
import {
  TAG_PREFIX,
  gearFitsEntry,
  isTagId,
  libraryEntry,
  matchExerciseName,
  normalize,
  withRoles,
} from "../lib/exercise-library";
import { parseJson } from "../lib/json";
import type { ExerciseTag, ExerciseTagger } from "../ports/exercise-tagger";

export type ResolvedExercise = {
  canonicalId: string;
  muscles: ExerciseMuscle[];
  source: ExerciseSource;
  via: "exact" | "token_set" | "cache" | "tagger";
};

export type ResolveStats = { names: number; library: number; cache: number; tagged: number; taggerCalls: number };

type TagRow = typeof exerciseTags.$inferSelect;

/** D1 caps bound parameters at 100 per statement. */
const IN_CHUNK = 50;
const INSERT_CHUNK = 10;

const chunks = <T>(xs: readonly T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};

/** Library-only resolve (pure, no D1, no AI). */
export const resolveFromLibrary = (name: string): ResolvedExercise | null => {
  const hit = matchExerciseName(name);
  if (!hit) return null;
  return { canonicalId: hit.entry.id, muscles: withRoles(hit.entry.muscles), source: "library", via: hit.via };
};

/** Wire fields for an exercise that has no stored id yet (previews, legacy rows). */
export const libraryFocus = (name: string): { canonicalId: string | null; muscles: ExerciseMuscle[] } => {
  const hit = resolveFromLibrary(name);
  return { canonicalId: hit?.canonicalId ?? null, muscles: hit?.muscles ?? [] };
};

const rowMuscles =(row: Pick<TagRow, "musclesJson">): ExerciseMuscle[] =>
  withRoles(parseJson<{ id: MuscleId; pct: number }[]>(row.musclesJson, []));

const sourceOf = (canonicalId: string, tagSource: string): ExerciseSource =>
  !isTagId(canonicalId) ? "library" : tagSource === "ai" ? "ai" : "heuristic";

const fromRow = (row: TagRow): ResolvedExercise => ({
  canonicalId: row.canonicalId,
  muscles: rowMuscles(row),
  source: sourceOf(row.canonicalId, row.source),
  via: "cache",
});

const loadTagRows = async (db: AppDB, keys: readonly string[]): Promise<TagRow[]> => {
  const out: TagRow[] = [];
  for (const part of chunks([...new Set(keys)], IN_CHUNK)) {
    out.push(...(await db.select().from(exerciseTags).where(inArray(exerciseTags.normalizedName, part))));
  }
  return out;
};

/** Cache row for a tag. An AI canonical id is kept only if it exists and its gear fits the name. */
const toRow = (name: string, key: string, tag: ExerciseTag): typeof exerciseTags.$inferInsert => {
  const entry = tag.canonicalId ? libraryEntry(tag.canonicalId) : null;
  const known = entry && gearFitsEntry(name, entry) ? entry : null;
  return {
    normalizedName: key,
    canonicalId: known ? known.id : `${TAG_PREFIX}${key}`,
    musclesJson: JSON.stringify(known ? known.muscles : tag.muscles),
    scoring: known ? known.scoring : tag.scoring,
    pattern: known ? known.pattern : tag.pattern,
    source: tag.source,
    model: tag.model,
    createdAt: new Date(),
  };
};

type ResolveOpts = { db?: AppDB; tagger?: ExerciseTagger; names: readonly string[] };

/**
 * Resolve a batch of plan names: library → D1 `exercise_tags` cache → one tagger call for
 * the rest (cached). Names that stay unresolved (no db/tagger, blank) are absent from the map.
 */
export const resolveExerciseNames = async ({
  db,
  tagger,
  names,
}: ResolveOpts): Promise<{ byName: Map<string, ResolvedExercise>; stats: ResolveStats }> => {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const byName = new Map<string, ResolvedExercise>();
  const stats: ResolveStats = { names: unique.length, library: 0, cache: 0, tagged: 0, taggerCalls: 0 };

  const misses: { name: string; key: string }[] = [];
  for (const name of unique) {
    const hit = resolveFromLibrary(name);
    if (hit) {
      byName.set(name, hit);
      stats.library += 1;
      continue;
    }
    const key = normalize(name);
    if (key) misses.push({ name, key });
  }

  if (db && misses.length) {
    const rows = new Map((await loadTagRows(db, misses.map((m) => m.key))).map((r) => [r.normalizedName, r]));
    // An AI tagger upgrades rows the heuristic adapter wrote while no key was set.
    const upgrade = tagger?.provider === "ai";
    for (const m of misses) {
      const row = rows.get(m.key);
      if (!row || (upgrade && row.source === "heuristic")) continue;
      byName.set(m.name, fromRow(row));
      stats.cache += 1;
    }
  }

  const untagged = misses.filter((m) => !byName.has(m.name));
  if (tagger && untagged.length) {
    stats.taggerCalls = 1;
    const tags = await tagger.tag({
      names: untagged.map((m) => m.name),
      library: EXERCISE_LIBRARY.map((e) => ({ id: e.id, name: e.name })),
    });
    const tagByName = new Map(tags.map((t) => [t.name, t]));
    const fresh = new Map<string, typeof exerciseTags.$inferInsert>();
    for (const m of untagged) {
      const tag = tagByName.get(m.name);
      if (!tag) continue;
      const row = fresh.get(m.key) ?? toRow(m.name, m.key, tag);
      fresh.set(m.key, row);
      byName.set(m.name, {
        canonicalId: row.canonicalId,
        muscles: rowMuscles(row),
        source: sourceOf(row.canonicalId, tag.source),
        via: "tagger",
      });
      stats.tagged += 1;
    }
    if (db) {
      for (const part of chunks([...fresh.values()], INSERT_CHUNK)) {
        await db
          .insert(exerciseTags)
          .values(part)
          .onConflictDoUpdate({
            target: exerciseTags.normalizedName,
            set: {
              canonicalId: sql`excluded.canonical_id`,
              musclesJson: sql`excluded.muscles_json`,
              scoring: sql`excluded.scoring`,
              pattern: sql`excluded.pattern`,
              source: sql`excluded.source`,
              model: sql`excluded.model`,
            },
          });
      }
    }
  }

  console.log("[exercise-resolve]", JSON.stringify(stats));
  return { byName, stats };
};

/** Muscles for stored canonical ids (plan read path): library entries, then one cache query. */
export const musclesForCanonicalIds = async (
  db: AppDB,
  ids: readonly string[],
): Promise<Map<string, ExerciseMuscle[]>> => {
  const out = new Map<string, ExerciseMuscle[]>();
  const tagKeys: string[] = [];
  for (const id of new Set(ids)) {
    const entry = libraryEntry(id);
    if (entry) out.set(id, withRoles(entry.muscles));
    else if (isTagId(id)) tagKeys.push(id.slice(TAG_PREFIX.length));
  }
  if (tagKeys.length) {
    for (const row of await loadTagRows(db, tagKeys)) out.set(row.canonicalId, rowMuscles(row));
  }
  return out;
};

/** Cached `tag:*` entry for `GET /v1/exercises/:canonicalId`. */
export const loadTagEntry = async (db: AppDB, canonicalId: string): Promise<TagRow | null> => {
  if (!isTagId(canonicalId)) return null;
  const [row] = await loadTagRows(db, [canonicalId.slice(TAG_PREFIX.length)]);
  return row && row.canonicalId === canonicalId ? row : null;
};
