import { Lock } from "lucide-react-native";
import { Pressable, Text } from "react-native";

import { pressFeedback } from "@/features/today/press-style";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import { RankGlyph } from "./RankGlyph";
import type { RankChipModel } from "./rank-meta";

type Props = {
  readonly chip: RankChipModel;
  /** Narrow screens (< 360pt): glyph only. */
  readonly compact?: boolean;
  readonly onPress?: () => void;
};

/** S40 Today rank chip: lock + "Spark 3/7" while locked, lavender title once earned. */
export const KineticRankChip = ({ chip, compact = false, onPress }: Props) => {
  const tint = chip.locked ? color.onSurfaceVariant : color.onSecondaryContainer;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={chip.locked ? `Kinetic rank locked, ${chip.label} days` : `Kinetic rank ${chip.label}`}
      onPress={onPress}
      style={({ pressed }) => [
        sx("shrink-0 flex-row items-center gap-1 rounded-full border border-outline-variant bg-surface-container-high px-[10px] py-1.5"),
        pressFeedback(pressed),
      ]}
    >
      {chip.locked ? <Lock size={14} color={tint} /> : compact ? <RankGlyph icon={chip.icon} size={14} tint={tint} /> : null}
      {compact ? null : (
        <Text
          numberOfLines={1}
          style={sx(`font-label-md text-label-md ${chip.locked ? "text-on-surface-variant" : "text-on-secondary-container"}`)}
        >
          {chip.label}
        </Text>
      )}
    </Pressable>
  );
};
