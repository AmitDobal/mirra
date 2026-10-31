import {
  ContextEnvelopeSchema,
  type AiContextFeature,
  type ContextEnvelope,
  type HardConstraint,
  type PersonalizationContextInput,
} from "@mirra/contracts";

import type { preferences, profiles } from "../db/schema";
import { parseJson } from "../lib/json";

type PrefsRow = typeof preferences.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;
type Profile = ContextEnvelope["profile"];

export type ContextRows = { prefs: PrefsRow; profile: ProfileRow };

const MAX_CONSTRAINTS = 40;
const MAX_AVOID_FOODS = 15;
const MAX_NOTES_CHARS = 600;

/** Strip control chars and angle brackets so free text cannot close or fake a data tag. */
const cleanText = (raw: string, max: number): string =>
  raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

/** Free text is data, never instructions. The system prompt says so too. */
const wrapUserNotes = (raw: string | null | undefined): string | null => {
  const text = cleanText(raw ?? "", MAX_NOTES_CHARS);
  return text ? `<user_notes>${text}</user_notes>` : null;
};

/**
 * Physiological input for a named energy equation ONLY (architecture §D).
 * Legacy `profiles.sex` maps through for female/male. Anything else is null.
 * Never derived from gender identity, name, pronouns, or imagery choice.
 */
export const toSexForEquations = (legacySex: string | null | undefined): "female" | "male" | null =>
  legacySex === "female" || legacySex === "male" ? legacySex : null;

const splitAvoidList = (foodsAvoid: string | null | undefined): string[] => {
  const seen = new Set<string>();
  for (const part of (foodsAvoid ?? "").split(/[,;\n]+/)) {
    const value = cleanText(part, 60).toLowerCase();
    if (value) seen.add(value);
    if (seen.size >= MAX_AVOID_FOODS) break;
  }
  return [...seen];
};

const setting = <T extends HardConstraint["type"]>(type: T, values: string[], max: number) =>
  values
    .map((v) => cleanText(v, max))
    .filter(Boolean)
    .map((value) => ({ type, value, source: "user_setting" as const }));

const unique = (values: string[]): string[] => [...new Set(values)];

const DAY_NAMES = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** 1=Mon..7=Sun → names. The envelope only carries strings, and names are unambiguous for an LLM. */
const trainDayNames = (days: number[]): string[] =>
  unique(days.filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b).map((d) => DAY_NAMES[d - 1]!));

const equipmentConstraints = (prefs: PrefsRow): HardConstraint[] =>
  setting("equipment", unique(parseJson<string[]>(prefs.equipmentJson, [])), 40) as HardConstraint[];

const foodConstraints = (prefs: PrefsRow): HardConstraint[] =>
  [
    ...setting("diet", unique(parseJson<string[]>(prefs.dietTagsJson, [])), 40),
    ...setting("avoid_food", splitAvoidList(prefs.foodsAvoid), 60),
    // "other" never widens the catalog; it is passed through as-is for the validator.
    ...setting("cuisine_only", unique(parseJson<string[]>(prefs.cuisineJson, [])), 40),
  ] as HardConstraint[];

/**
 * Constraints stored as explicit settings today. `allergy`, `injury`, `excluded_movement`
 * have no D1 column yet, so they stay empty until a setting exists (never inferred from notes).
 */
const constraintsFor = (feature: AiContextFeature, prefs: PrefsRow): HardConstraint[] => {
  switch (feature) {
    case "workout_plan":
      return equipmentConstraints(prefs);
    case "meal_plan":
    case "recipe_chat":
      return foodConstraints(prefs);
    case "coach":
      return [];
  }
};

/** Body inputs for calorie/macro equations. Only meal_plan and workout_plan may carry them. */
const equationInputs = (profile: ProfileRow): Profile => {
  const sexForEquations = toSexForEquations(profile.sex);
  return {
    ageYears: profile.ageYears ?? null,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    goalWeightKg: profile.goalWeightKg ?? null,
    pace: profile.pace ?? null,
    sexForEquations,
    equationMode: sexForEquations ? "sex_specific_estimate" : "neutral_or_manual",
  };
};

const profileFor = (
  feature: AiContextFeature,
  { prefs, profile }: ContextRows,
  overrides: PersonalizationContextInput["overrides"],
): Profile => {
  switch (feature) {
    case "workout_plan":
      return {
        goal: prefs.primaryGoal,
        experience: prefs.experience,
        trainDays: trainDayNames(overrides?.trainDays ?? parseJson<number[]>(prefs.trainDaysJson, [])),
        sessionMinutes: prefs.sessionMinutes,
        physiqueTarget: prefs.physiqueTarget ?? null,
        lifestyleNotes: wrapUserNotes(prefs.lifestyleNotes),
        ...equationInputs(profile),
      };
    case "meal_plan":
      return {
        goal: prefs.primaryGoal,
        units: prefs.units,
        cuisineStyles: parseJson<string[]>(prefs.cuisineJson, []),
        ...equationInputs(profile),
      };
    case "recipe_chat":
      return {
        goal: prefs.primaryGoal,
        units: prefs.units,
        cuisineStyles: parseJson<string[]>(prefs.cuisineJson, []),
      };
    case "coach":
      return { goal: prefs.primaryGoal, trainerPersona: prefs.trainerPersona };
  }
};

/** Stable JSON: object keys sorted recursively so equal content hashes equal. */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Pure: D1 rows → validated envelope. Hash covers settings content only (profile, constraints,
 * memories, feature, schema version), not the clock or the day, so it works as a cache key.
 */
export const buildContextEnvelope = async (
  rows: ContextRows,
  input: PersonalizationContextInput,
  now: Date = new Date(),
): Promise<ContextEnvelope> => {
  const { feature, subjectId, localDate, overrides } = input;
  const profile = profileFor(feature, rows, overrides);
  const hardConstraints = constraintsFor(feature, rows.prefs).slice(0, MAX_CONSTRAINTS);
  const relevantMemories: ContextEnvelope["relevantMemories"] = [];

  const contextHash = await sha256Hex(
    stableStringify({ schemaVersion: 1, feature, profile, hardConstraints, relevantMemories }),
  );

  return ContextEnvelopeSchema.parse({
    schemaVersion: 1,
    feature,
    profile,
    hardConstraints,
    currentState: { localDate, ...(subjectId ? { subjectId } : {}) },
    relevantMemories,
    generatedAt: now.toISOString(),
    contextHash,
  });
};
