import type { FoodPrefs } from "@/lib/api";

export type DietChoice = "no_preference" | "vegetarian" | "vegan";

export const DIET_OPTIONS: readonly { id: DietChoice; label: string }[] = [
  { id: "no_preference", label: "Omnivore" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
];

export const AVOID_OPTIONS = ["nuts", "dairy", "shellfish"] as const;

const EXCLUSIVE_DIETS: readonly string[] = DIET_OPTIONS.map((d) => d.id);
/** Any of these means the user already told us how they eat. */
const DECIDED_TAGS: readonly string[] = [...EXCLUSIVE_DIETS, "halal", "dairy_free", "gluten_free"];

/** Missing diet (empty / only `high_protein`) or no cuisine yet → ask before generating. */
export const needsDietPrompt = (prefs: FoodPrefs | null): boolean =>
  !prefs ||
  !prefs.dietTags.some((t) => DECIDED_TAGS.includes(t)) ||
  prefs.cuisineStyles.length === 0;

export const currentDiet = (tags: readonly string[]): DietChoice | null =>
  DIET_OPTIONS.find((d) => tags.includes(d.id))?.id ?? null;

const splitAvoid = (text: string | null): string[] =>
  (text ?? "")
    .split(/[,;\n]+/)
    .map((w) => w.trim())
    .filter(Boolean);

const isChipWord = (word: string) =>
  (AVOID_OPTIONS as readonly string[]).includes(word.toLowerCase());

export const selectedAvoid = (text: string | null): string[] =>
  splitAvoid(text)
    .map((w) => w.toLowerCase())
    .filter(isChipWord);

/** Chip picks replace chip words; free-text the user typed in onboarding is kept. */
export const buildFoodPrefs = (
  prev: FoodPrefs | null,
  diet: DietChoice,
  avoid: readonly string[],
  cuisineStyles: readonly string[],
): { dietTags: string[]; foodsAvoid: string | null; cuisineStyles: string[] } => {
  const keptTags = (prev?.dietTags ?? []).filter((t) => !EXCLUSIVE_DIETS.includes(t));
  const extras = splitAvoid(prev?.foodsAvoid ?? null).filter((w) => !isChipWord(w));
  const words = [...extras, ...avoid];
  return {
    dietTags: [...keptTags, diet],
    foodsAvoid: words.length > 0 ? words.join(", ") : null,
    cuisineStyles: [...cuisineStyles],
  };
};
