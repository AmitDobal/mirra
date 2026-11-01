import type { MealAnalysisJob, MealEstimateResultV2 } from "@mirra/contracts";

import { and, eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { mealAnalysisJobs } from "../db/schema";
import { msToUnix } from "../lib/dates";
import { newId } from "../lib/id";
import { parseJsonColumn } from "../lib/json";

type JobRow = typeof mealAnalysisJobs.$inferSelect;

export const toJobResponse = (row: JobRow): MealAnalysisJob => ({
  id: row.id,
  mealId: row.mealId,
  mediaId: row.mediaId,
  status: row.status as MealAnalysisJob["status"],
  result: parseJsonColumn<MealEstimateResultV2 | null>(row.resultJson, null),
  error: row.error,
  createdAt: msToUnix(row.createdAt) ?? 0,
  finishedAt: msToUnix(row.finishedAt),
});

/** Queue a retry / offline-flush analysis for a saved meal. A consumer picks `queued` rows up later. */
export const enqueueMealAnalysis = async (
  db: AppDB,
  userId: string,
  input: { mealId: string; mediaId: string | null; description: string },
): Promise<MealAnalysisJob> => {
  const row: JobRow = {
    id: newId(),
    userId,
    mealId: input.mealId,
    mediaId: input.mediaId,
    status: "queued",
    inputJson: JSON.stringify({ description: input.description }),
    resultJson: null,
    error: null,
    createdAt: new Date(),
    finishedAt: null,
  };
  await db.insert(mealAnalysisJobs).values(row);
  return toJobResponse(row);
};

export const findMealAnalysisJob = async (
  db: AppDB,
  userId: string,
  jobId: string,
): Promise<MealAnalysisJob | null> => {
  const [row] = await db
    .select()
    .from(mealAnalysisJobs)
    .where(and(eq(mealAnalysisJobs.id, jobId), eq(mealAnalysisJobs.userId, userId)))
    .limit(1);
  return row ? toJobResponse(row) : null;
};
