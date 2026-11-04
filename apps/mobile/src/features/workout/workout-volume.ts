/**
 * S17 "volume": Σ load × reps over the sets logged this session (AMI-172). The store keeps
 * kg; imperial users see lb. Bodyweight lifts count their *added* load only.
 * Pure: node tests import it directly.
 */
import { toDisplayLoad, type LoadUnit } from "./load-units";

export type LoggedSet = { readonly weightKg: number; readonly reps: number };

/** One entry per exercise + set, so re-logging a corrected set replaces it. */
export type LoggedSets = Readonly<Record<string, LoggedSet>>;

export const loggedKey = (exerciseId: string, setNumber: number): string => `${exerciseId}#${setNumber}`;

export const sessionVolumeKg = (logged: LoggedSets): number =>
  Object.values(logged).reduce(
    (sum, s) => sum + (s.weightKg > 0 && s.reps > 0 ? s.weightKg * s.reps : 0),
    0,
  );

/** "0", "560", "1.6k" in the user's unit. */
export const formatVolume = (kg: number, unit: LoadUnit): string => {
  const v = Math.round(unit === "kg" ? kg : toDisplayLoad(kg, unit));
  if (v < 1000) return String(v);
  const k = v / 1000;
  return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`;
};
