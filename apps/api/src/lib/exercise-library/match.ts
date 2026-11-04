/** Pure library matching: exact form, then equipment-safe token-set Jaccard (arch §3 steps 2-3). */

import type { LibraryExercise } from "./types";
import {
  EQUIPMENT_TOKENS,
  dropOptional,
  equipmentTokensForIds,
  equipmentTokensOf,
  normalize,
  normalizeVariants,
  tokensOf,
} from "./normalize";

export const JACCARD_MIN = 0.8;

type Form = {
  entry: LibraryExercise;
  normalized: string;
  core: Set<string>;
  gear: Set<string>;
};

export type LibraryIndex = {
  byId: ReadonlyMap<string, LibraryExercise>;
  exact: ReadonlyMap<string, LibraryExercise>;
  forms: readonly Form[];
  /** Normalized forms claimed by two different entries (the assert script fails on any). */
  collisions: readonly string[];
};

export type LibraryMatch = {
  entry: LibraryExercise;
  via: "exact" | "token_set";
  score: number;
};

const splitTokens = (normalized: string) => {
  const core = new Set<string>();
  const gear = new Set<string>();
  for (const t of tokensOf(normalized)) (EQUIPMENT_TOKENS.has(t) ? gear : core).add(t);
  return { core, gear };
};

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((t) => b.has(t));

const subset = (a: ReadonlySet<string>, b: ReadonlySet<string>) => [...a].every((t) => b.has(t));

/**
 * Gear agrees when the name and the alias mention the same gear, or the alias names none
 * and every gear word in the name is gear the entry is done with.
 */
const gearCompatible = (input: ReadonlySet<string>, form: Form): boolean => {
  if (sameSet(input, form.gear)) return true;
  if (form.gear.size > 0) return false;
  return subset(input, equipmentTokensForIds(form.entry.equipment));
};

export const jaccard = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
};

export const buildLibraryIndex = (entries: readonly LibraryExercise[]): LibraryIndex => {
  const byId = new Map<string, LibraryExercise>();
  const exact = new Map<string, LibraryExercise>();
  const forms: Form[] = [];
  const collisions: string[] = [];

  const add = (normalized: string, entry: LibraryExercise, strict: boolean) => {
    if (!normalized) return;
    const prev = exact.get(normalized);
    if (prev && prev.id !== entry.id) {
      if (strict) collisions.push(`${normalized}: ${prev.id} vs ${entry.id}`);
      return;
    }
    if (prev) return;
    exact.set(normalized, entry);
    forms.push({ entry, normalized, ...splitTokens(normalized) });
  };

  for (const entry of entries) {
    if (byId.has(entry.id)) collisions.push(`duplicate id ${entry.id}`);
    byId.set(entry.id, entry);
    const own = [entry.id.replace(/_/g, " "), entry.name, ...entry.aliases].map(normalize);
    for (const n of own) add(n, entry, true);
  }
  // Optional-token-free forms ("cable row" from "seated cable row") never override real aliases.
  for (const form of [...forms]) add(dropOptional(form.normalized), form.entry, false);

  return { byId, exact, forms, collisions };
};

const bestTokenSet = (index: LibraryIndex, normalized: string): LibraryMatch | null => {
  const { core, gear } = splitTokens(normalized);
  if (core.size === 0) return null;
  let best: LibraryMatch | null = null;
  // Tie-break: same gear words beat "gear the entry allows", then the shorter form.
  let bestRank: [number, number] = [0, Infinity];
  for (const form of index.forms) {
    if (!gearCompatible(gear, form)) continue;
    const score = jaccard(core, form.core);
    if (score < JACCARD_MIN) continue;
    const rank: [number, number] = [sameSet(gear, form.gear) ? 1 : 0, form.normalized.length];
    const better =
      !best ||
      score > best.score ||
      (score === best.score && (rank[0] > bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])));
    if (better) {
      best = { entry: form.entry, via: "token_set", score };
      bestRank = rank;
    }
  }
  return best;
};

/** Library-only resolve. Null means "ask the cache, then the tagger". */
export const matchLibrary = (index: LibraryIndex, name: string): LibraryMatch | null => {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const byId = index.byId.get(trimmed);
  if (byId) return { entry: byId, via: "exact", score: 1 };
  // Per form: exact, then token set, so "Lunges (dumbbell)" finds the dumbbell lunge
  // before the parenthesis-free "lunge" form is tried.
  for (const v of normalizeVariants(trimmed)) {
    const exact = index.exact.get(v);
    if (exact) return { entry: exact, via: "exact", score: 1 };
    const hit = bestTokenSet(index, v);
    if (hit) return hit;
  }
  return null;
};

/** True when a name's gear words fit an entry (guards AI-proposed canonical ids too). */
export const gearFitsEntry = (name: string, entry: LibraryExercise): boolean =>
  subset(equipmentTokensOf(normalize(name)), equipmentTokensForIds(entry.equipment));
