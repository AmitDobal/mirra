import { useEffect, useState } from "react";

import { getProfile } from "@/db";
import { useMeStore } from "@/stores/me-store";

import { pickProfileSex, toProfileSex, type ProfileSex } from "./profile-sex";

/** Last local read, so later mounts start on the right figure (no male flash). */
let lastLocal: ProfileSex | null = null;

/**
 * Profile sex for sex-aware imagery (anatomy maps): server /me profile, else the
 * local SQLite profile; null until either is known (figures fall back to male).
 */
export const useProfileSex = (): ProfileSex | null => {
  const remote = useMeStore((s) => s.me?.profile?.sex);
  const [local, setLocal] = useState<ProfileSex | null>(lastLocal);
  useEffect(() => {
    let alive = true;
    void getProfile()
      .then((p) => {
        lastLocal = toProfileSex(p?.sex);
        if (alive) setLocal(lastLocal);
      })
      .catch(() => undefined);
    // Signed in on a new device: no local row; /me carries the onboarding sex.
    if (!useMeStore.getState().me) void useMeStore.getState().ensureMe().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return pickProfileSex(remote, local);
};
