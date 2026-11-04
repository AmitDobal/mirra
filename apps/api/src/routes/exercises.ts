import type { LibraryExerciseResponse, MuscleId } from "@mirra/contracts";
import { ExercisePatternSchema, ExerciseScoringSchema } from "@mirra/contracts";
import { Hono } from "hono";

import { createDb } from "../db";
import type { MirraEnv } from "../env";
import { libraryEntry, libraryResponse, withRoles } from "../lib/exercise-library";
import { notFound } from "../lib/errors";
import { parseJson } from "../lib/json";
import type { AuthVars } from "../middleware/auth";
import { requireAuth } from "../middleware/auth";
import { loadTagEntry } from "../services/exercise-resolve";

export const exerciseRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: AuthVars;
}>();

const titleCase = (s: string): string => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Library entry (no standards numbers), or a cached `tag:*` entry for an AI-tagged lift. */
exerciseRoutes.get("/v1/exercises/:canonicalId", requireAuth, async (c) => {
  const id = c.req.param("canonicalId").trim();
  const entry = libraryEntry(id);
  if (entry) return c.json(libraryResponse(entry));

  const row = await loadTagEntry(createDb(c.env.DB), id);
  if (!row) throw notFound("Exercise not found");
  const body: LibraryExerciseResponse = {
    canonicalId: row.canonicalId,
    name: titleCase(row.normalizedName),
    aliases: [],
    equipment: [],
    pattern: ExercisePatternSchema.catch("core").parse(row.pattern),
    muscles: withRoles(parseJson<{ id: MuscleId; pct: number }[]>(row.musclesJson, [])),
    scoring: ExerciseScoringSchema.catch("reps").parse(row.scoring),
    bwFactor: null,
    ranked: false,
    loadPerHand: false,
    source: row.source === "ai" ? "ai" : "heuristic",
  };
  return c.json(body);
});
