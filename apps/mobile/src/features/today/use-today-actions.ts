import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { getTodayActions, type TodayActionsResponse } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";

/** `GET /v1/today/actions`; refetches whenever Today regains focus (after meal / workout / check-in / water). */
export const useTodayActions = () => {
  const [actions, setActions] = useState<TodayActionsResponse | null>(null);
  const [failed, setFailed] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setActions(await getTodayActions());
      setFailed(false);
    } catch (err) {
      setFailed(true);
      logger.warn("today.actions.failed", { message: errorMessage(err) });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  return { actions, failed, refetch };
};
