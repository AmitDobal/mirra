import { Pressable, Text } from "react-native";

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
    className={`min-h-touch items-center justify-center rounded-full border px-space-md py-space-sm ${
      selected
        ? "border-primary-container bg-primary-container"
        : "border-outline-variant bg-surface-container-high"
    }`}
  >
    <Text
      className={`font-label text-label-md ${
        selected ? "text-on-primary-fixed" : "text-on-surface"
      }`}
    >
      {label}
    </Text>
  </Pressable>
);
