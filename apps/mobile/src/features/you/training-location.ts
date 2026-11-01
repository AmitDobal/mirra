import { setLocalTrainingLocation } from "@/db";
import { patchTrainingLocation } from "@/lib/api/me";

export type TrainingLocationId = "gym" | "home" | "hotel";

export const toTrainingLocationId = (
  value: string | null | undefined,
): TrainingLocationId => {
  if (value === "home" || value === "hotel" || value === "gym") return value;
  return "gym";
};

/** Persist location to API + local SQLite. Throws on network failure. */
export const persistTrainingLocation = async (id: TrainingLocationId): Promise<void> => {
  await patchTrainingLocation(id);
  await setLocalTrainingLocation(id);
};

export const formatCreditsRefreshed = (ms: number): string => {
  if (!ms) return "Not yet";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "Not yet";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
