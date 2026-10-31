import { create } from "zustand";

import {
  DEFAULT_TRAINER_PERSONA,
  toTrainerPersonaId,
  type TrainerPersonaId,
} from "@/content/trainer-personas";
import { getProfile, setLocalTrainerPersona } from "@/db";
import { getMyTrainerPersona, patchTrainerPersona } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

type PersonaStore = {
  readonly persona: TrainerPersonaId;
  readonly saving: boolean;
  /** Load from local SQLite, then best-effort sync from the API (server wins). */
  readonly hydrate: () => Promise<void>;
  /** PATCH /v1/me/preferences, then update local SQLite and the store. Returns false on failure. */
  readonly choose: (persona: TrainerPersonaId) => Promise<boolean>;
};

export const usePersonaStore = create<PersonaStore>((set, get) => ({
  persona: DEFAULT_TRAINER_PERSONA,
  saving: false,
  hydrate: async () => {
    try {
      const profile = await getProfile();
      if (profile?.preferences) {
        set({ persona: toTrainerPersonaId(profile.preferences.trainerPersona) });
      }
    } catch (err) {
      logger.warn("trainer.hydrate.local_failed", { message: errorMessage(err) });
    }
    try {
      const remote = await getMyTrainerPersona();
      if (!remote) return;
      const next = toTrainerPersonaId(remote);
      if (next === get().persona) return;
      set({ persona: next });
      await setLocalTrainerPersona(next);
    } catch (err) {
      logger.warn("trainer.hydrate.remote_failed", { message: errorMessage(err) });
    }
  },
  choose: async (persona) => {
    if (get().saving) return false;
    set({ saving: true });
    try {
      await patchTrainerPersona(persona);
      await setLocalTrainerPersona(persona);
      set({ persona, saving: false });
      return true;
    } catch (err) {
      logger.warn("trainer.choose.failed", { message: errorMessage(err) });
      set({ saving: false });
      return false;
    }
  },
}));
