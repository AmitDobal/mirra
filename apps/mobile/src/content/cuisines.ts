import type { CuisineId } from "@/features/onboarding/types";

/** Cuisine chips shared by onboarding and the food-prefs sheet. Ids match API `CuisineStyleSchema`. Indian not first. */
export const CUISINE_OPTIONS: readonly { id: CuisineId; label: string }[] = [
  { id: "mediterranean", label: "Mediterranean" },
  { id: "american", label: "American" },
  { id: "mexican", label: "Mexican" },
  { id: "chinese", label: "Chinese" },
  { id: "japanese", label: "Japanese" },
  { id: "thai", label: "Thai" },
  { id: "korean", label: "Korean" },
  { id: "indian", label: "Indian" },
  { id: "middle_eastern", label: "Mideast" },
  { id: "other", label: "Other" },
];
