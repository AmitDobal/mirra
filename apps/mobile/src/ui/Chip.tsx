import { Pressable, StyleSheet, Text } from "react-native";

import { color, font, radius, space, type } from "@/theme/tokens";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

/** Selectable pill — lime fill when selected. */
export const Chip = ({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
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
    <Text
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
    minHeight: space.touch,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  label: {
    fontFamily: font.label,
    fontSize: type.labelMd.size,
    lineHeight: type.labelMd.line,
    letterSpacing: type.labelMd.tracking * type.labelMd.size,
  },
});
