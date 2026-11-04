import { toTrainerPersonaId, type TrainerPersonaId } from "@/content/trainer-personas";

/** I/O the persona hydrate needs; injected so the flow is testable without SQLite or fetch. */
export type PersonaSyncDeps = {
  readonly readLocal: () => Promise<string | null | undefined>;
  readonly readRemote: () => Promise<string | null>;
  readonly writeLocal: (persona: TrainerPersonaId) => Promise<void>;
  readonly getPersona: () => TrainerPersonaId;
  readonly setPersona: (persona: TrainerPersonaId) => void;
  /** Bumped by every user pick; a hydrate that started before a pick must not overwrite it. */
  readonly getEpoch: () => number;
  readonly warn: (event: string, err: unknown) => void;
};

/**
 * Local SQLite first (instant), then the server value wins (`/v1/me` preferences).
 * Returns the persona the store ends on.
 */
export const syncPersona = async (deps: PersonaSyncDeps): Promise<TrainerPersonaId> => {
  const epoch = deps.getEpoch();
  try {
    const local = await deps.readLocal();
    if (local && deps.getEpoch() === epoch) deps.setPersona(toTrainerPersonaId(local));
  } catch (err) {
    deps.warn("trainer.hydrate.local_failed", err);
  }
  try {
    const remote = await deps.readRemote();
    if (!remote || deps.getEpoch() !== epoch) return deps.getPersona();
    const next = toTrainerPersonaId(remote);
    deps.setPersona(next);
    await deps.writeLocal(next);
  } catch (err) {
    deps.warn("trainer.hydrate.remote_failed", err);
  }
  return deps.getPersona();
};
