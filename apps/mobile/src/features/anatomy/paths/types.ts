/** Slugs used by the vendored react-native-body-highlighter art (see ./LICENSE.md). */
export type VendorSlug =
  | "abs"
  | "adductors"
  | "ankles"
  | "biceps"
  | "calves"
  | "chest"
  | "deltoids"
  | "feet"
  | "forearm"
  | "gluteal"
  | "hair"
  | "hamstring"
  | "hands"
  | "head"
  | "knees"
  | "lower-back"
  | "neck"
  | "obliques"
  | "quadriceps"
  | "tibialis"
  | "trapezius"
  | "triceps"
  | "upper-back";

/** One drawn region: every path for a slug (common + left + right). */
export type FigurePart = {
  readonly slug: VendorSlug;
  readonly d: readonly string[];
};

export type FigureArt = {
  readonly viewBox: string;
  readonly parts: readonly FigurePart[];
};
