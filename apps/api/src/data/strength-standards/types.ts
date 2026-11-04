import type { AnchorId } from "../../lib/exercise-library/types";

/**
 * `[bodyweightKg, T5, T20, T50, T80, T95]`: values at percentiles 5/20/50/80/95.
 * Units: e1RM kg (load and bodyweight lifts; bodyweight lifts include bw × bwFactor),
 * seconds (plank).
 */
export type StandardsRow = readonly [number, number, number, number, number, number];

export type StandardsTable = Readonly<Record<AnchorId, readonly StandardsRow[]>>;
