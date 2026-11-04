/**
 * S05 height stepper (AMI-183). Store keeps cm; "ft" users see 5'9" and step one
 * inch at a time (was a decimal "5.7" feet). Pure: node tests import it directly.
 */
import { cmToFtIn, ftInToCm } from "../you/profile-format";

import type { HeightUnit } from "./types";

export const HEIGHT_MIN_CM = 120;
export const HEIGHT_MAX_CM = 230;

const clampCm = (cm: number): number => Math.min(HEIGHT_MAX_CM, Math.max(HEIGHT_MIN_CM, cm));

/** "175" for cm, `5'9"` for ft. */
export const heightDisplay = (cm: number, unit: HeightUnit): string => {
  if (unit === "cm") return `${Math.round(cm)}`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};

/** One − / + tap: 1 cm, or 1 inch (snapped to whole inches) for ft. */
export const stepHeightCm = (cm: number, unit: HeightUnit, dir: -1 | 1): number => {
  if (unit === "cm") return clampCm(Math.round(cm) + dir);
  const totalIn = Math.round(cm / 2.54) + dir;
  const next = ftInToCm(Math.floor(totalIn / 12), totalIn % 12);
  return next < HEIGHT_MIN_CM || next > HEIGHT_MAX_CM ? cm : next;
};

/** Spoken value for screen readers: "175 centimeters" / "5 feet 9 inches". */
export const heightA11y = (cm: number, unit: HeightUnit): string => {
  if (unit === "cm") return `${Math.round(cm)} centimeters`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft} feet ${inch} inches`;
};
