import { uploadMedia } from "@/lib/api";
import { getAuthUserId } from "@/lib/auth/session";
import { errorMessage, logger } from "@/lib/logger";

import { useOnboardingStore } from "../store";

/**
 * Upload the mirror selfie (kind=mirror) and remember the confirmed media id.
 * Returns true when there is nothing to upload or the photo is stored for the
 * current user; false on failure. Never throws: callers soft-fail.
 */
export const uploadMirrorSelfie = async (): Promise<boolean> => {
  const { mirrorUri, mirrorMediaId, mirrorMediaOwnerId, setMirrorMedia } =
    useOnboardingStore.getState();
  if (!mirrorUri) return true;

  const ownerId = getAuthUserId();
  if (mirrorMediaId && mirrorMediaOwnerId === ownerId) return true;

  try {
    const mediaId = await uploadMedia("mirror", mirrorUri);
    // Photo may have changed while uploading; only attach if still current.
    if (useOnboardingStore.getState().mirrorUri !== mirrorUri) return true;
    setMirrorMedia(mediaId, ownerId);
    return true;
  } catch (err) {
    logger.warn("onboarding.mirror_upload_failed", { message: errorMessage(err) });
    return false;
  }
};
