import { router } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";
import { create } from "zustand";

import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

type LimitState = {
  readonly visible: boolean;
  readonly resetsAt: string | null;
  readonly open: (resetsAt?: string | null) => void;
  readonly close: () => void;
};

/** Global sheet for AI 402 / exhausted credits. Mount once near root. */
export const useAiLimitStore = create<LimitState>((set) => ({
  visible: false,
  resetsAt: null,
  open: (resetsAt = null) => set({ visible: true, resetsAt }),
  close: () => set({ visible: false, resetsAt: null }),
}));

export const openAiLimitSheet = (resetsAt?: string | null) =>
  useAiLimitStore.getState().open(resetsAt);

const formatReset = (iso: string | null): string => {
  if (!iso) return "next month";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "next month";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
};

/** Bottom sheet: out of AI credits → manage plan. Clear English only. */
export const AiLimitSheet = () => {
  const visible = useAiLimitStore((s) => s.visible);
  const resetsAt = useAiLimitStore((s) => s.resetsAt);
  const close = useAiLimitStore((s) => s.close);

  const handleUpgrade = () => {
    close();
    router.push("/(onboarding)/paywall");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss credits notice"
        onPress={close}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg")}
        >
          <CapsLabel>AI credits</CapsLabel>
          <Text style={sx("mt-space-sm font-headline-semi text-headline-sm text-on-surface")}>
            You&apos;re out of AI credits
          </Text>
          <Text style={sx("mt-space-sm font-body text-body-md text-on-surface-variant")}>
            Credits refill on {formatReset(resetsAt)}. Free tips and manual edits still work.
            Upgrade for a larger monthly pool.
          </Text>
          <View style={sx("mt-space-md gap-space-sm")}>
            <LimeCta label="See plans" onPress={handleUpgrade} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Not now"
              onPress={close}
              style={sx("items-center py-space-sm")}
            >
              <Text style={sx("font-label text-label-md text-on-surface-variant")}>Not now</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
