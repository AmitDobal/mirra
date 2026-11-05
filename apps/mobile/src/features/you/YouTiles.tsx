import { router, useFocusEffect } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import { rankCopy } from "@/content/rank";
import { strengthCopy } from "@/content/strength";
import { useBadgeStore } from "@/features/rank/badge-store";
import { earnedRankId, titleForRank, unlockedSet } from "@/features/rank/rank-meta";
import { teaserView, useStrengthStore } from "@/features/strength";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { t } from "./you-text";

const Tile = ({
  eyebrow,
  title,
  line,
  a11y,
  onPress,
}: {
  eyebrow: string;
  title: string;
  line: string;
  a11y: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={a11y}
    onPress={onPress}
    style={({ pressed }) => [
      sx("min-w-0 flex-1 justify-between rounded-[24px] border border-surface-container-high bg-surface-container-low p-4"),
      pressed ? { opacity: 0.9 } : null,
    ]}
  >
    <View style={sx("absolute right-4 top-4")}>
      <ChevronRight size={16} color={color.onSurfaceVariant} />
    </View>
    <View style={sx("pr-4")}>
      <CapsLabel tone="lime" numberOfLines={1}>{eyebrow}</CapsLabel>
      <Text numberOfLines={2} style={[sx("mt-1"), t.tileTitle]}>
        {title}
      </Text>
    </View>
    <Text numberOfLines={2} style={sx("mt-3 font-body text-body-sm text-on-surface-variant")}>{line}</Text>
  </Pressable>
);

/** S41 Kinetic Rank + Strength Tier teasers side by side (16pt gutter). */
export const YouTiles = () => {
  const data = useBadgeStore((s) => s.data);
  const defs = data?.definitions ?? [];
  const rank = titleForRank(defs, earnedRankId(defs, unlockedSet(data?.unlocked ?? [])));

  const overview = useStrengthStore((s) => s.overview);
  const loadStrength = useStrengthStore((s) => s.loadOverview);
  // Refetch on every You focus: workouts completed elsewhere change tiers.
  useFocusEffect(
    useCallback(() => {
      void loadStrength();
    }, [loadStrength]),
  );
  const strength = teaserView(overview);

  return (
    <View style={sx("mt-4 flex-row gap-4")}>
      <Tile
        eyebrow={rankCopy.teaserEyebrow}
        title={rank ?? rankCopy.teaserEmpty}
        line={rankCopy.teaserLine(data?.bestStreak ?? 0)}
        a11y="Open kinetic rank progression"
        onPress={() => router.push("/kinetic-rank")}
      />
      <Tile
        eyebrow={strengthCopy.teaserEyebrow}
        title={strength.title}
        line={strength.line}
        a11y={`Open strength tiers, ${strength.title}`}
        onPress={() => router.push("/strength")}
      />
    </View>
  );
};
