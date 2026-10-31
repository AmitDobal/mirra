import { eq } from "drizzle-orm";

import type { AppDB } from "../db";
import { preferences, profiles } from "../db/schema";
import { badRequest } from "../lib/errors";
import type { PersonalizationContextPort } from "../ports/personalization-context";
import { buildContextEnvelope } from "../services/personalization-context";

/** D1 adapter: reads `preferences` + `profiles` for one user (always filtered by `user_id`). */
export const createD1PersonalizationContext = (db: AppDB): PersonalizationContextPort => ({
  build: async (input) => {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, input.userId))
      .limit(1);
    const [prefs] = await db
      .select()
      .from(preferences)
      .where(eq(preferences.userId, input.userId))
      .limit(1);
    if (!profile || !prefs) throw badRequest("Onboarding incomplete — PUT /v1/onboarding first");
    return buildContextEnvelope({ prefs, profile }, input);
  },
});
