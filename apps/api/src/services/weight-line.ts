import { desc, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { profiles, weightLogs } from "../db/schema";

/** One short weight line for the briefing, or null when no weight is known. */
export const loadWeightLine = async (db: AppDB, userId: string): Promise<string | null> => {
  const [profile] = await db
    .select({ weightKg: profiles.weightKg, goalWeightKg: profiles.goalWeightKg })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const [latestWeight] = await db
    .select({ kg: weightLogs.kg })
    .from(weightLogs)
    .where(eq(weightLogs.userId, userId))
    .orderBy(desc(weightLogs.loggedAt))
    .limit(1);
  const currentKg = latestWeight?.kg ?? profile?.weightKg ?? null;
  const goalKg = profile?.goalWeightKg ?? null;
  if (currentKg == null) return null;
  if (goalKg == null) return `Weight ${currentKg}kg`;
  const delta = Math.round((currentKg - goalKg) * 10) / 10;
  if (delta > 0) return `Weight ${currentKg}kg · ${delta}kg above goal`;
  if (delta < 0) return `Weight ${currentKg}kg · ${Math.abs(delta)}kg below goal`;
  return `Weight ${currentKg}kg · at goal`;
};
