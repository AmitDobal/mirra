import { createD1PersonalizationContext } from "../adapters/d1-personalization-context";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { PersonalizationContextPort } from "../ports/personalization-context";

/**
 * Settings → AI context. No vendor, so there is one adapter (D1); the port keeps tests and
 * future sources (health sync, memory notes) swappable. Routes/services call this factory only.
 */
export const getPersonalizationContext = (
  _env: MirraEnv,
  db: AppDB,
): PersonalizationContextPort => createD1PersonalizationContext(db);
