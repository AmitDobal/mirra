import { create } from "zustand";

import { DEFAULT_TRAINER_PERSONA, type TrainerPersonaId } from "@/content/trainer-personas";
import { getProfile, setLocalTrainerPersona } from "@/db";
import { getMyTrainerPersona, patchTrainerPersona } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

import { syncPersona } from "./persona-sync";

type PersonaStore = {
  readonly persona: TrainerPersonaId;
  readonly saving: boolean;
  /** Bumped on every successful pick so an in-flight hydrate cannot overwrite it. */
  readonly epoch: number;
  /**
   * Load from local SQLite, then sync from `/v1/me` (server wins).
   * `force` skips the /me TTL cache (after auth or a persona change).
   */
  readonly hydrate: (opts?: { force?: boolean }) => Promise<void>;
  /** PATCH /v1/me/preferences, then update local SQLite and the store. Returns false on failure. */
  readonly choose: (persona: TrainerPersonaId) => Promise<boolean>;
};

export const usePersonaStore = create<PersonaStore>((set, get) => ({
  persona: DEFAULT_TRAINER_PERSONA,
  saving: false,
  epoch: 0,
  hydrate: async (opts) => {
    await syncPersona({
      readLocal: async () => (await getProfile())?.preferences?.trainerPersona,
      readRemote: () => getMyTrainerPersona({ force: opts?.force === true }),
      writeLocal: (persona) => setLocalTrainerPersona(persona),
      getPersona: () => get().persona,
      setPersona: (persona) => {
        if (persona !== get().persona) set({ persona });
      },
      getEpoch: () => get().epoch,
      warn: (event, err) => logger.warn(event, { message: errorMessage(err) }),
    });
  },
  choose: async (persona) => {
    if (get().saving) return false;
    set({ saving: true });
    try {
      await patchTrainerPersona(persona);
      set({ persona, saving: false, epoch: get().epoch + 1 });
      await setLocalTrainerPersona(persona).catch((err: unknown) =>
        logger.warn("trainer.choose.local_failed", { message: errorMessage(err) }),
      );
      // Refresh the /me cache so later hydrates (and coach context) read the new value.
      void get().hydrate({ force: true });
      return true;
    } catch (err) {
      logger.warn("trainer.choose.failed", { message: errorMessage(err) });
      set({ saving: false });
      return false;
    }
  },
}));
