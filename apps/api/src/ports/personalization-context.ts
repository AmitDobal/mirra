import type { ContextEnvelope, PersonalizationContextInput } from "@mirra/contracts";

/**
 * Single reader of explicit user settings (D1 `preferences` + `profiles`) for AI features.
 * Returns a Zod-validated, feature-scoped envelope. Generators consume the envelope;
 * they never hand-roll their own reads of `preferences`.
 */
export type PersonalizationContextPort = {
  build: (input: PersonalizationContextInput) => Promise<ContextEnvelope>;
};

export const stubPersonalizationContext: PersonalizationContextPort = {
  build: async () => {
    throw new Error("PersonalizationContextPort not configured");
  },
};
