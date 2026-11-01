import { router } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { MirraApiError } from "@/lib/api/client";
import { deleteMe } from "@/lib/api/me";
import { errorMessage, logger } from "@/lib/logger";

import { wipeLocalUserData } from "./wipe-local-data";

const FAIL_TITLE = "Couldn't delete account";

/** Two-step confirm → DELETE /v1/me → local wipe → welcome. */
export const useDeleteAccount = () => {
  const [deleting, setDeleting] = useState(false);

  const run = useCallback(async () => {
    setDeleting(true);
    try {
      try {
        await deleteMe();
      } catch (err) {
        // 401 = account already gone server-side: finish the local wipe.
        if (!(err instanceof MirraApiError && err.status === 401)) throw err;
      }
    } catch (err) {
      logger.error("account.delete.failed", { message: errorMessage(err) });
      setDeleting(false);
      Alert.alert(FAIL_TITLE, "Check your connection and try again. Nothing was removed.");
      return;
    }
    try {
      await wipeLocalUserData();
    } catch (err) {
      logger.error("account.delete.local_wipe_failed", { message: errorMessage(err) });
    }
    setDeleting(false);
    router.replace("/(onboarding)/welcome");
  }, []);

  const confirm = useCallback(() => {
    if (deleting) return;
    Alert.alert(
      "Delete account?",
      "This permanently deletes your Mirra account, meals, workouts, photos and plan. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Delete everything?",
              "Last chance. All your data will be erased from this device and our servers.",
              [
                { text: "Keep my account", style: "cancel" },
                {
                  text: "Delete forever",
                  style: "destructive",
                  onPress: () => void run(),
                },
              ],
            ),
        },
      ],
    );
  }, [deleting, run]);

  return { deleting, confirm };
};
