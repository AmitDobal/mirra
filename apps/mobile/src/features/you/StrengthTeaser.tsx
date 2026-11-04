import { router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { strengthCopy } from "@/content/strength";
import { teaserView, useStrengthStore } from "@/features/strength";
import { TierBadge } from "@/features/strength-ui";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

/** You tab "Strength tier" card → S34 map. Overall label, or "Locked · 3/8". */
export const StrengthTeaser = () => {
  const overview = useStrengthStore((s) => s.overview);
  const load = useStrengthStore((s) => s.loadOverview);
  // Refetch on every You focus: workouts completed elsewhere change tiers.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const view = teaserView(overview);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open strength tiers, ${view.title}`}
      onPress={() => router.push("/strength")}
      style={({ pressed }) => [
        sx("mb-space-md flex-row items-center justify-between gap-3 rounded-lg border border-surface-container-high bg-surface-container-low p-4"),
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      <View style={sx("min-w-0 flex-1 gap-1")}>
        <CapsLabel tone="lime">{strengthCopy.teaserEyebrow}</CapsLabel>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{view.title}</Text>
        <Text style={sx("font-body-sm text-body-sm text-on-surface-variant")}>{view.line}</Text>
      </View>
      <TierBadge tier={view.place?.tier ?? null} division={view.place?.division ?? null} size="sm" />
      <ChevronRight size={22} color={color.onSurfaceVariant} />
    </Pressable>
  );
};
