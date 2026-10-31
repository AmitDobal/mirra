import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { playTodayVoiceCueOnce } from "@/features/coach/voice-cue";

/** On Today focus: speak the day's coach cue once per local date (non-blocking). */
export const useVoiceCueOnFocus = (): void => {
  useFocusEffect(
    useCallback(() => {
      void playTodayVoiceCueOnce();
    }, []),
  );
};
