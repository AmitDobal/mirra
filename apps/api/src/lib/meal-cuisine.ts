import { UNIVERSAL, type VettedFood } from "../data/vetted-foods";

/** Onboarding id for "a cuisine we do not list". Never means "show every cuisine". */
export const OTHER_CUISINE = "other";

/** Free-text words (lifestyle notes / other-cuisine text) → catalog cuisine ids they hint at. */
const CUISINE_KEYWORDS: Record<string, string> = {
  indian: "indian",
  curry: "indian",
  dal: "indian",
  paneer: "indian",
  chinese: "chinese",
  stirfry: "chinese",
  japanese: "japanese",
  sushi: "japanese",
  ramen: "japanese",
  korean: "korean",
  kimchi: "korean",
  thai: "thai",
  mexican: "mexican",
  taco: "mexican",
  tacos: "mexican",
  burrito: "mexican",
  mediterranean: "mediterranean",
  greek: "mediterranean",
  italian: "mediterranean",
  arabic: "middle_eastern",
  lebanese: "middle_eastern",
  turkish: "middle_eastern",
  american: "american",
  bbq: "american",
};

/** Cuisine ids hinted at by free text (only used when the user picked "other"). */
export const cuisineHintsFromText = (text: string | null | undefined): string[] => {
  const hits = new Set<string>();
  for (const word of (text ?? "").toLowerCase().split(/[^a-z]+/)) {
    const id = CUISINE_KEYWORDS[word];
    if (id) hits.add(id);
  }
  return [...hits];
};

/**
 * Cuisine ids a food may belong to for this user.
 * - Specific picks always count.
 * - "other" never bypasses the filter: it adds the catalog's "other"-tagged foods plus any
 *   cuisines hinted at in `hintText`. With only "other" and no hints you get universal + "other" foods.
 */
export const effectiveCuisines = (
  cuisineStyles: readonly string[],
  hintText?: string | null,
): Set<string> => {
  const set = new Set(cuisineStyles);
  if (set.has(OTHER_CUISINE)) for (const id of cuisineHintsFromText(hintText)) set.add(id);
  return set;
};

/**
 * Keep a food when it is universal, untagged, or shares a cuisine with the user's picks.
 * An empty list (legacy rows from before cuisine onboarding) means no cuisine filter.
 * "other" is NOT a bypass — see `effectiveCuisines`.
 */
export const matchesCuisines = (
  food: VettedFood,
  cuisineStyles: readonly string[],
  hintText?: string | null,
): boolean => {
  if (cuisineStyles.length === 0) return true;
  if (food.cuisines.length === 0 || food.cuisines.includes(UNIVERSAL)) return true;
  const wanted = effectiveCuisines(cuisineStyles, hintText);
  return food.cuisines.some((c) => wanted.has(c));
};
