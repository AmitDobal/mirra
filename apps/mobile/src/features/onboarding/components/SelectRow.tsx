import { Pressable, Text, View } from "react-native";

type SelectRowProps = {
  label: string;
  hint?: string;
  selected?: boolean;
  onPress: () => void;
};

/** Single-select elevated row with lime left accent when selected. */
export const SelectRow = ({
  label,
  hint,
  selected = false,
  onPress,
}: SelectRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    onPress={onPress}
    className={`min-h-touch flex-row items-center overflow-hidden rounded-DEFAULT border bg-surface-container-high ${
      selected ? "border-primary-container" : "border-transparent"
    }`}
  >
    <View
      className={`h-full w-1 self-stretch ${
        selected ? "bg-primary-container" : "bg-transparent"
      }`}
    />
    <View className="flex-1 px-space-md py-space-md">
      <Text
        className={`font-headline-semi text-headline-sm ${
          selected ? "text-on-surface" : "text-on-surface"
        }`}
      >
        {label}
      </Text>
      {hint ? (
        <Text className="mt-1 font-body text-body-sm text-on-surface-variant">
          {hint}
        </Text>
      ) : null}
    </View>
  </Pressable>
);
