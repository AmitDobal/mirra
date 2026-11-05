import { getDb } from "../client";
import { getLocalUserId, nowMs } from "../ids";
import { toJson } from "../json";

/** Local mirror of PATCH /v1/me/profile (AMI-176). Only keys present are written; no-op without rows. */
export type LocalProfilePatch = {
  readonly sex?: string;
  readonly ageYears?: number;
  readonly heightCm?: number;
  readonly goalWeightKg?: number | null;
  readonly pace?: string;
  readonly units?: string;
  readonly primaryGoal?: string;
  readonly physiqueTarget?: string | null;
  readonly experience?: string;
  readonly lifestyleNotes?: string | null;
  readonly trainDays?: readonly number[];
  readonly sessionMinutes?: number;
  readonly equipment?: readonly string[];
};

const PROFILE_COLS: Record<string, string> = {
  sex: "sex",
  ageYears: "age_years",
  heightCm: "height_cm",
  goalWeightKg: "goal_weight_kg",
  pace: "pace",
};

const PREFS_COLS: Record<string, string> = {
  units: "units",
  primaryGoal: "primary_goal",
  physiqueTarget: "physique_target",
  experience: "experience",
  lifestyleNotes: "lifestyle_notes",
  trainDays: "train_days_json",
  sessionMinutes: "session_minutes",
  equipment: "equipment_json",
};

const toSql = (v: unknown): string | number | null =>
  Array.isArray(v) ? toJson(v) : (v as string | number | null);

const update = async (table: string, cols: Record<string, string>, patch: object, userId: string) => {
  const entries = Object.entries(patch).filter(([k, v]) => k in cols && v !== undefined);
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${cols[k]} = ?`).join(", ");
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${table} SET ${sets}, updated_at = ? WHERE user_id = ?`,
    ...entries.map(([, v]) => toSql(v)),
    nowMs(),
    userId,
  );
};

/** Mirror a saved profile edit into SQLite so offline screens (workout units, plan input) agree. */
export const patchLocalProfile = async (
  patch: LocalProfilePatch,
  userId: string = getLocalUserId(),
): Promise<void> => {
  await update("profiles", PROFILE_COLS, patch, userId);
  await update("preferences", PREFS_COLS, patch, userId);
};
