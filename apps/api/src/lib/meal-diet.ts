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
  beef: "meat",
  chicken: "meat",
  turkey: "meat",
};

const tokens = (text: string | null | undefined): string[] =>
  (text ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3);

/** Catalog rows safe for this user's diet tags, avoid-list and cuisines. */
export const filterCatalog = (
  dietTags: string[],
  foodsAvoid: string | null | undefined,
  cuisineStyles: readonly string[],
  /** Free text (lifestyle notes) that can boost cuisines when the user picked "other". */
  cuisineHintText?: string | null,
): VettedFood[] => {
  const excludedTags = new Set<string>();
  for (const d of dietTags) for (const t of DIET_EXCLUDES[d] ?? []) excludedTags.add(t);

  const words = tokens(foodsAvoid);
  for (const w of words) {
    const tag = KEYWORD_TAGS[w] ?? KEYWORD_TAGS[w.replace(/s$/, "")];
    if (tag) excludedTags.add(tag);
  }

  return VETTED_FOODS.filter((f) => {
    if (!matchesCuisines(f, cuisineStyles, cuisineHintText)) return false;
    if (f.tags.some((t) => excludedTags.has(t))) return false;
    const haystack = `${f.id.replace(/_/g, " ")} ${f.name.toLowerCase()}`;
    return !words.some((w) => haystack.includes(w.replace(/s$/, "")));
  });
};
