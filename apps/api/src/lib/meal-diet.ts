import { VETTED_FOODS, type VettedFood } from "../data/vetted-foods";
import { foodBannedBy, resolveDietConstraints, type DietConstraints, type DietInput } from "./diet-constraints";
import { matchesCuisines } from "./meal-cuisine";

export { matchesCuisines };

/**
 * Catalog rows safe for these constraints and cuisines. AMI-199: bans come from
 * `resolveDietConstraints` (diet tags, avoid list, cuisine cultural defaults, timezone).
 */
export const filterCatalogBy = (
  constraints: DietConstraints,
  cuisineStyles: readonly string[],
  cuisineHintText?: string | null,
): VettedFood[] =>
  VETTED_FOODS.filter(
    (f) => matchesCuisines(f, cuisineStyles, cuisineHintText) && foodBannedBy(f, constraints) === null,
  );

/** Catalog rows safe for this user's diet tags, avoid-list and cuisines (+ cultural defaults). */
export const filterCatalog = (
  dietTags: readonly string[],
  foodsAvoid: string | null | undefined,
  cuisineStyles: readonly string[],
  /** Free text (lifestyle notes) that can boost cuisines when the user picked "other". */
  cuisineHintText?: string | null,
  timezone?: string | null,
): VettedFood[] =>
  filterCatalogBy(
    resolveDietConstraints({ dietTags, foodsAvoid, cuisineStyles, hintText: cuisineHintText, timezone }),
    cuisineStyles,
    cuisineHintText,
  );

/** Constraints + filtered catalog in one call (meal plan, plan chat, chef). */
export const dietCatalog = (input: DietInput): { constraints: DietConstraints; foods: VettedFood[] } => {
  const constraints = resolveDietConstraints(input);
  return { constraints, foods: filterCatalogBy(constraints, input.cuisineStyles, input.hintText) };
};
