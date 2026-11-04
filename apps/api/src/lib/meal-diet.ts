import { VETTED_FOODS, type VettedFood } from "../data/vetted-foods";
import { matchesCuisines } from "./meal-cuisine";

export { matchesCuisines };

/** Food tags each onboarding diet id excludes. */
const DIET_EXCLUDES: Record<string, string[]> = {
  vegetarian: ["meat", "fish", "shellfish"],
  vegan: ["meat", "fish", "shellfish", "egg", "dairy"],
  dairy_free: ["dairy"],
  gluten_free: ["gluten"],
  halal: ["pork"],
};

/** Free-text words (foods_avoid) → catalog tags they imply. */
const KEYWORD_TAGS: Record<string, string> = {
  nut: "nuts",
  nuts: "nuts",
  peanut: "nuts",
  almond: "nuts",
  walnut: "nuts",
  dairy: "dairy",
  milk: "dairy",
  lactose: "dairy",
  cheese: "dairy",
  egg: "egg",
  eggs: "egg",
  gluten: "gluten",
  wheat: "gluten",
  soy: "soy",
  fish: "fish",
  seafood: "fish",
  shellfish: "shellfish",
  shrimp: "shellfish",
  meat: "meat",
};

/**
 * Single ingredients inside a broad tag. "Avoid chicken" bans chicken only (the name match in
 * `filterCatalog`), never every `meat` food. Used to widen a banned tag to words for recipe
 * checks ("vegetarian" still forbids "chicken").
 */
const INGREDIENT_TAGS: Record<string, string> = {
  beef: "meat",
  chicken: "meat",
  turkey: "meat",
  pork: "meat",
};

const tokens = (text: string | null | undefined): string[] =>
  (text ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3);

/** Words from a free-text avoid list (3+ letters, lowercased). */
export const avoidWordsOf = (foodsAvoid: string | null | undefined): string[] => tokens(foodsAvoid);

/** Catalog tags excluded by diet ids and by the free-text avoid list. */
export const excludedTagsFor = (
  dietTags: readonly string[],
  foodsAvoid: string | null | undefined,
): Set<string> => {
  const excludedTags = new Set<string>();
  for (const d of dietTags) for (const t of DIET_EXCLUDES[d] ?? []) excludedTags.add(t);
  for (const w of tokens(foodsAvoid)) {
    const tag = KEYWORD_TAGS[w] ?? KEYWORD_TAGS[w.replace(/s$/, "")];
    if (tag) excludedTags.add(tag);
  }
  return excludedTags;
};

/** Free-text keywords (flat) for banned tags, e.g. meat → meat, beef, chicken, turkey, pork. */
export const keywordsForTags = (tags: ReadonlySet<string>): string[] =>
  [...Object.entries(KEYWORD_TAGS), ...Object.entries(INGREDIENT_TAGS)]
    .filter(([, tag]) => tags.has(tag))
    .map(([word]) => word);

/** Catalog rows safe for this user's diet tags, avoid-list and cuisines. */
export const filterCatalog = (
  dietTags: string[],
  foodsAvoid: string | null | undefined,
  cuisineStyles: readonly string[],
  /** Free text (lifestyle notes) that can boost cuisines when the user picked "other". */
  cuisineHintText?: string | null,
): VettedFood[] => {
  const excludedTags = excludedTagsFor(dietTags, foodsAvoid);
  const words = tokens(foodsAvoid);

  return VETTED_FOODS.filter((f) => {
    if (!matchesCuisines(f, cuisineStyles, cuisineHintText)) return false;
    if (f.tags.some((t) => excludedTags.has(t))) return false;
    const haystack = `${f.id.replace(/_/g, " ")} ${f.name.toLowerCase()}`;
    return !words.some((w) => haystack.includes(w.replace(/s$/, "")));
  });
};
