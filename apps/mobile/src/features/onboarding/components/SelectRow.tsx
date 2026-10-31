import { Check } from "lucide-react-native";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type SelectRowProps = {
  label: string;
  hint?: string;
  selected?: boolean;
  onPress: () => void;
  /** Leading circular icon (Stitch S03). */
  icon?: ReactNode;
};

const tintIcon = (icon: ReactNode, selected: boolean) => {
  if (!isValidElement(icon)) return icon;
  return cloneElement(icon as ReactElement<{ color?: string }>, {
    color: selected ? color.onPrimaryFixed : color.onSurfaceVariant,
  });
};

/** Single-select elevated row with lime accent, icon, and check when selected. */
export const SelectRow = ({
  label,
  hint,
  selected = false,
  onPress,
  icon,
}: SelectRowProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    onPress={onPress}
    style={sx(
      `min-h-touch flex-row items-center overflow-hidden rounded-2xl border bg-surface-container-high ${
        selected ? "border-primary-fixed" : "border-transparent"
      }`,
    )}
  >
    <View
      style={sx(
        `h-full w-1 self-stretch ${selected ? "bg-primary-fixed" : "bg-transparent"}`,
      )}
    />
    {icon ? (
      <View
        style={sx(
          `ml-space-md h-10 w-10 items-center justify-center rounded-full ${
            selected ? "bg-primary-fixed" : "bg-surface-container-highest"
          }`,
        )}
      >
        {tintIcon(icon, selected)}
      </View>
    ) : null}
    <View style={sx("flex-1 px-space-md py-space-md")}>
      <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>{label}</Text>
      {hint ? (
        <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>{hint}</Text>
      ) : null}
    </View>
    <View
      style={sx(
        `mr-space-md h-6 w-6 items-center justify-center rounded-full ${
          selected ? "bg-primary-fixed" : "border border-outline-variant"
        }`,
      )}
    >
      {selected ? <Check size={14} color={color.onPrimaryFixed} strokeWidth={3} /> : null}
    </View>
  </Pressable>
);
