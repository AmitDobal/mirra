import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius, space } from "@/theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Show check glyph when selected (Stitch equipment pills). */
  showCheck?: boolean;
};

/** Selectable pill — lime fill when selected. Compact type so long labels fit. */
export const Chip = ({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
  showCheck = false,
}: ChipProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[
      styles.base,
      selected
        ? {
            borderColor: color.primaryContainer,
            backgroundColor: color.primaryContainer,
          }
        : {
            borderColor: color.outlineVariant,
            backgroundColor: color.surfaceContainerHigh,
          },
    ]}
  >
    {showCheck && selected ? (
      <View style={styles.check}>
        <Check size={11} color={color.onPrimaryFixed} strokeWidth={3} />
      </View>
    ) : null}
    <Text
      numberOfLines={1}
      style={[
        styles.label,
        { color: selected ? color.onPrimaryFixed : color.onSurface },
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  check: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flexShrink: 1,
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.02 * 12,
  },
});
