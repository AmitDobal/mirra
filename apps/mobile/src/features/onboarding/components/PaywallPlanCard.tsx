import { Check } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type PaywallPlanCardProps = {
  title: string;
  /** Secondary line under the title (per-month or billing note). */
  note: string;
  price: string;
  unit: string;
  selected: boolean;
  onSelect: () => void;
  /** "Best value" pill shown above the title (annual). */
  badge?: string;
};

/** S13 plan option: elevated + lime check when selected, quiet radio when not. */
export const PaywallPlanCard = ({
  title,
  note,
  price,
  unit,
  selected,
  onSelect,
  badge,
}: PaywallPlanCardProps) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityLabel={`${title} ${price} ${unit}`}
    accessibilityState={{ selected, checked: selected }}
    onPress={onSelect}
    style={sx(
      `rounded-2xl border p-space-md ${
        selected
          ? "border-2 border-primary-fixed bg-surface-container-high"
          : "border-outline-variant/20 bg-surface-container-low"
      }`,
    )}
  >
    <View style={sx("mb-space-sm min-h-6 flex-row items-center justify-between")}>
      {badge ? (
        <View style={sx("rounded-full bg-primary-container px-space-sm py-space-xs")}>
          <Text style={sx("font-label-bold text-label-caps uppercase text-on-primary-fixed")}>
            {badge}
          </Text>
        </View>
      ) : (
        <View />
      )}
      <View
        style={sx(
          `h-5 w-5 items-center justify-center rounded-full ${
            selected ? "bg-primary-container" : "bg-surface-container-highest"
          }`,
        )}
      >
        {selected ? <Check color={color.onPrimary} size={14} strokeWidth={3} /> : null}
      </View>
    </View>
    <View style={sx("flex-row items-end justify-between")}>
      <View style={sx("flex-1 pr-space-md")}>
        <Text style={sx("font-headline-semi text-headline-md text-primary")}>{title}</Text>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{note}</Text>
      </View>
      <View style={sx("items-end")}>
        <Text style={sx("font-headline text-headline-md text-primary")}>{price}</Text>
        <Text style={sx("font-label-bold text-label-caps text-on-surface-variant")}>
          {unit}
        </Text>
      </View>
    </View>
  </Pressable>
);
