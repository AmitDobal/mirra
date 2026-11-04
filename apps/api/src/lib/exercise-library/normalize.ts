/** Pure exercise-name normalization (arch §3 step 1). Exported for AMI-166 chat targeting. */

const WORD_MAP: Readonly<Record<string, string>> = {
  db: "dumbbell",
  dbs: "dumbbell",
  bb: "barbell",
  kb: "kettlebell",
  rdl: "romanian deadlift",
  sldl: "stiff leg deadlift",
  ohp: "overhead press",
  pushup: "push up",
  pullup: "pull up",
  chinup: "chin up",
  situp: "sit up",
  ups: "up",
  stepup: "step up",
  banded: "band",
  flye: "fly",
  calves: "calf",
  hyperextension: "back extension",
  hyper: "back extension",
};

/** Two-word forms folded into one token so equipment and movement words stay atomic. */
const BIGRAMS: Readonly<Record<string, string>> = {
  "pull down": "pulldown",
  "push down": "pushdown",
  "pull over": "pullover",
  "wood chop": "woodchop",
  "ez bar": "ezbar",
  "trap bar": "trapbar",
  "hex bar": "trapbar",
  "med ball": "medball",
  "medicine ball": "medball",
  "body weight": "bodyweight",
  "dumb bell": "dumbbell",
  "kettle bell": "kettlebell",
  "resistance band": "band",
  "smith machine": "smith",
};

const FILLER: ReadonlySet<string> = new Set(["the", "a", "an", "and", "with", "or", "of", "to", "on"]);

/** Dropped only as a second try, so aliases that use them still match first. */
export const OPTIONAL_TOKENS: ReadonlySet<string> = new Set(["standing", "seated"]);

/** Equipment words. A token-set match must agree on these (no "dumbbell row" → barbell row). */
export const EQUIPMENT_TOKENS: ReadonlySet<string> = new Set([
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "band",
  "smith",
  "ezbar",
  "trapbar",
  "bodyweight",
  "medball",
]);

/**
 * Equipment id → name tokens. Onboarding ids plus `kettlebell` / `medicine_ball`, which only
 * describe library entries. `bench` has none (it names a lift too).
 */
export const EQUIPMENT_ID_TOKENS: Readonly<Record<string, readonly string[]>> = {
  barbell: ["barbell", "ezbar", "trapbar"],
  dumbbells: ["dumbbell"],
  kettlebell: ["kettlebell"],
  medicine_ball: ["medball"],
  cables: ["cable"],
  machines: ["machine", "smith"],
  bands: ["band"],
  bodyweight: ["bodyweight"],
};

const singular = (w: string): string => {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (/(ch|sh|x)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(ss|us|is|as)$/.test(w)) return w.slice(0, -1);
  return w;
};

const mapWords = (words: string[]): string[] =>
  words.flatMap((w) => (WORD_MAP[w] ?? w).split(" "));

const foldBigrams = (words: string[]): string[] => {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const pair = `${words[i]} ${words[i + 1] ?? ""}`;
    const folded = BIGRAMS[pair];
    if (folded) {
      out.push(folded);
      i += 1;
    } else {
      out.push(words[i]!);
    }
  }
  return out;
};

const clean = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Normalize text that has no parentheses left. */
const normalizeFlat = (raw: string): string => {
  const words = mapWords(clean(raw).split(" ").filter(Boolean));
  const single = mapWords(words.map(singular));
  return foldBigrams(single)
    .filter((w) => !FILLER.has(w))
    .join(" ");
};

const stripOrParens = (raw: string): string => raw.replace(/\(\s*or\b[^)]*\)/gi, " ");

/**
 * Lowercase, drop punctuation and parenthetical notes, expand db/bb/kb, singularize, fold
 * two-word gear names, drop filler words. "Incline DB Presses (slow)" → "incline dumbbell press".
 */
export const normalize = (name: string): string => normalizeFlat(name.replace(/\([^)]*\)/g, " "));

/** Space-separated tokens of an already normalized string. */
export const tokensOf = (normalized: string): string[] => normalized.split(" ").filter(Boolean);

export const dropOptional = (normalized: string): string =>
  tokensOf(normalized)
    .filter((t) => !OPTIONAL_TOKENS.has(t))
    .join(" ");

/**
 * Lookup forms in priority order: parenthetical kept as words ("Push-ups (knees)" →
 * "push up knee"), parenthetical dropped, then both without optional tokens, then the
 * part before a "/" ("Lat pulldown / pull-up" → "lat pulldown").
 */
export const normalizeVariants = (name: string): string[] => {
  const base = stripOrParens(name);
  const forms = [normalizeFlat(base), normalize(base)];
  const out = [...forms, ...forms.map(dropOptional)];
  if (base.includes("/")) out.push(normalize(base.split("/")[0]!));
  return [...new Set(out.filter(Boolean))];
};

/** Equipment tokens a normalized name mentions. */
export const equipmentTokensOf = (normalized: string): Set<string> =>
  new Set(tokensOf(normalized).filter((t) => EQUIPMENT_TOKENS.has(t)));

/** Equipment tokens implied by an entry's onboarding equipment ids. */
export const equipmentTokensForIds = (ids: readonly string[]): Set<string> =>
  new Set(ids.flatMap((id) => EQUIPMENT_ID_TOKENS[id] ?? []));
