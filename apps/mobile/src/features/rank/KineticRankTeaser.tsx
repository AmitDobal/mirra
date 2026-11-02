import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { useBadgeStore } from "./badge-store";
import { titleForRank } from "./rank-meta";

/** Compact Kinetic Rank entry on You tab (S33 teaser). */
export const KineticRankTeaser = () => {
  const data = useBadgeStore((s) => s.data);
  const rank = titleForRank(data?.definitions ?? [], data?.currentRankId ?? null);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open kinetic rank progression"
      onPress={() => router.push("/kinetic-rank")}
      style={({ pressed }) => [
        sx("mb-space-md flex-row items-center justify-between rounded-lg border border-surface-container-high bg-surface-container-low p-4"),
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      <View style={sx("min-w-0 flex-1 gap-1")}>
        <CapsLabel tone="lime">Kinetic rank</CapsLabel>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
          {rank ?? "Start your ladder"}
        </Text>
        <Text style={sx("font-body-sm text-body-sm text-on-surface-variant")}>
          Best streak {data?.bestStreak ?? 0} · Spark → Apex
        </Text>
      </View>
      <ChevronRight size={22} color={color.onSurfaceVariant} />
    </Pressable>
  );
};
