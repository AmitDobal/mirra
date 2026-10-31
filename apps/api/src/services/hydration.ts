import type { Hydration } from "@mirra/contracts";
import { and, eq, sql } from "drizzle-orm";

import type { AppDB } from "../db";
import { profiles, waterLogs } from "../db/schema";

const DEFAULT_TARGET_ML = 3000;
const ML_PER_KG = 35;
const ROUND_TO_ML = 250;

/** `weightKg * 35` ml rounded to the nearest 250; 3000 when weight is unknown. */
export const hydrationTargetMl = (weightKg: number | null | undefined): number => {
  if (!weightKg || weightKg <= 0) return DEFAULT_TARGET_ML;
  return Math.max(ROUND_TO_ML, Math.round((weightKg * ML_PER_KG) / ROUND_TO_ML) * ROUND_TO_ML);
};

/** Server-backed water total + target for one local date. */
export const loadHydration = async (
  db: AppDB,
  userId: string,
  localDate: string,
): Promise<Hydration> => {
  const [profile] = await db
    .select({ weightKg: profiles.weightKg })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${waterLogs.ml}), 0)` })
    .from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), eq(waterLogs.localDate, localDate)));
  return {
    targetMl: hydrationTargetMl(profile?.weightKg),
    loggedMl: Math.round(Number(row?.total ?? 0)),
  };
};
