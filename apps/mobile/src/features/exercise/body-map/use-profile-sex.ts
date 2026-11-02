import { useEffect, useState } from "react";

import { getProfile } from "@/db";
import type { SexId } from "@/features/onboarding/types";

/** Local profile sex for sex-aware imagery (falls back null until hydrated). */
export const useProfileSex = (): SexId | null => {
  const [sex, setSex] = useState<SexId | null>(null);
  useEffect(() => {
    let alive = true;
    void getProfile().then((p) => {
      if (alive) setSex((p?.sex as SexId | undefined) ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);
  return sex;
};
