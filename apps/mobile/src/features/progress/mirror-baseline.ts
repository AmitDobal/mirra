import { useEffect, useState } from "react";

import { useOnboardingStore } from "@/features/onboarding";
import { cacheProgressPhotoMedia } from "@/lib/api/progress";
import { errorMessage, logger } from "@/lib/logger";
import { useMeStore } from "@/stores/me-store";

import type { ComparePhoto } from "./compare-pair";

const LABEL = "Baseline · onboarding selfie";

const mediaIdOf = (profile: Record<string, unknown> | null | undefined): string | null => {
  const id = profile?.mirrorMediaId;
  return typeof id === "string" && id.length > 0 ? id : null;
};

/**
 * Onboarding mirror selfie as the S23 baseline (AMI-177): the in-session capture when
 * present, else the uploaded `kind=mirror` media from GET /v1/me, cached on device.
 */
export const useMirrorBaseline = (): ComparePhoto | null => {
  const localUri = useOnboardingStore((s) => s.mirrorUri);
  const mediaId = useMeStore((s) => mediaIdOf(s.me?.profile));
  const [remoteUri, setRemoteUri] = useState<string | null>(null);

  useEffect(() => {
    if (!useMeStore.getState().me) void useMeStore.getState().ensureMe().catch(() => null);
  }, []);

  useEffect(() => {
    if (localUri || !mediaId) return;
    let live = true;
    cacheProgressPhotoMedia(`mirror-${mediaId}`, `/v1/media/${mediaId}/content`)
      .then((uri) => {
        if (live) setRemoteUri(uri);
      })
      .catch((err: unknown) => {
        logger.warn("progress.mirror_baseline_failed", { message: errorMessage(err) });
      });
    return () => {
      live = false;
    };
  }, [localUri, mediaId]);

  const uri = localUri ?? remoteUri;
  return uri ? { id: "mirror-baseline", label: LABEL, uri, takenAt: null } : null;
};
