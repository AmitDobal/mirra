import { router } from "expo-router";
import { Modal, Pressable, Text, View } from "react-native";
import { create } from "zustand";

import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

/** `credits`: AI 402 / exhausted pool. `pro`: a Pro-only feature (rebuild, AMI-183). */
type LimitKind = "credits" | "pro";

type LimitState = {
  readonly visible: boolean;
  readonly kind: LimitKind;
  readonly resetsAt: string | null;
  readonly open: (resetsAt?: string | null, kind?: LimitKind) => void;
  readonly close: () => void;
};

/** Global upsell sheet (credits / Pro). Mount once near root. */
export const useAiLimitStore = create<LimitState>((set) => ({
  visible: false,
  kind: "credits",
  resetsAt: null,
  open: (resetsAt = null, kind = "credits") => set({ visible: true, resetsAt, kind }),
  close: () => set({ visible: false, resetsAt: null }),
}));

export const openAiLimitSheet = (resetsAt?: string | null) =>
  useAiLimitStore.getState().open(resetsAt);

/** Free user hit a Pro-only feature: same sheet, Pro copy, "See plans" → paywall. */
export const openProUpsell = () => useAiLimitStore.getState().open(null, "pro");

const formatReset = (iso: string | null): string => {
  if (!iso) return "next month";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "next month";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
};

const PRO = {
  eyebrow: "Mirra Pro",
  title: "Plan rebuilds are part of Pro",
  body: "Start your free trial and your coach rebuilds the rest of your week around missed days and check-ins. Your current plan stays as it is.",
} as const;

/** Bottom sheet: out of AI credits / Pro-only feature → paywall. Clear English only. */
export const AiLimitSheet = () => {
  const visible = useAiLimitStore((s) => s.visible);
  const resetsAt = useAiLimitStore((s) => s.resetsAt);
  const kind = useAiLimitStore((s) => s.kind);
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
          <CapsLabel>{kind === "pro" ? PRO.eyebrow : "AI credits"}</CapsLabel>
          <Text style={sx("mt-space-sm font-headline-semi text-headline-sm text-on-surface")}>
            {kind === "pro" ? PRO.title : "You're out of AI credits"}
          </Text>
          <Text style={sx("mt-space-sm font-body text-body-md text-on-surface-variant")}>
            {kind === "pro"
              ? PRO.body
              : `Credits refill on ${formatReset(resetsAt)}. Free tips and manual edits still work. Upgrade for a larger monthly pool.`}
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
