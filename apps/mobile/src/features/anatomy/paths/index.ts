import { FEMALE_BACK } from "./female-back";
import { FEMALE_FRONT } from "./female-front";
import { MALE_BACK } from "./male-back";
import { MALE_FRONT } from "./male-front";
import type { FigureArt } from "./types";

export type AnatomySex = "male" | "female";
export type AnatomySide = "front" | "back";

const ART: Record<AnatomySex, Record<AnatomySide, FigureArt>> = {
  male: { front: MALE_FRONT, back: MALE_BACK },
  female: { front: FEMALE_FRONT, back: FEMALE_BACK },
};

export const figureArt = (sex: AnatomySex, side: AnatomySide): FigureArt => ART[sex][side];

/** viewBox "x y w h" → aspect ratio w / h. */
export const viewBoxAspect = (viewBox: string): number => {
  const [, , w, h] = viewBox.split(" ").map(Number);
  return w && h ? w / h : 0.5;
};

export type { FigureArt, FigurePart, VendorSlug } from "./types";
