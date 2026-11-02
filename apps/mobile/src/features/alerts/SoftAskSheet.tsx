import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Modal, Pressable, View } from "react-native";

import { sx } from "@/theme/sx";

import { selectSoftAskDue, useAlertsStore } from "./alerts-store";
import { SoftAskBanner } from "./SoftAskBanner";

/** Today: first open before the user answers → one-time sheet (prefs `inAppEnabled` null). */
export const SoftAskSheet = () => {
  const hydrate = useAlertsStore((s) => s.hydrate);
  const due = useAlertsStore(selectSoftAskDue);
  const shown = useAlertsStore((s) => s.softAskShown);
  const enable = useAlertsStore((s) => s.enable);
  const dismiss = useAlertsStore((s) => s.dismissSoftAsk);

  useFocusEffect(
    useCallback(() => {
      void hydrate();
    }, [hydrate]),
  );

  const visible = due && !shown;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void dismiss()}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss alerts prompt"
        onPress={() => void dismiss()}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-xl")}>
            <SoftAskBanner
              showClose={false}
              onEnable={() => {
                useAlertsStore.getState().markSoftAskShown();
                void enable();
              }}
              onNotNow={() => void dismiss()}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
