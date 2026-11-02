import { BellRing, X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

type Props = {
  readonly onEnable: () => void;
  readonly onNotNow: () => void;
  /** Sheet variant on Today drops the dismiss "x" (Not now is enough). */
  readonly showClose?: boolean;
};

/** S30 soft-ask card: explains in-app alerts before the first Enable. */
export const SoftAskBanner = ({ onEnable, onNotNow, showClose = true }: Props) => (
  <View
    style={sx("rounded-lg border border-secondary-fixed-dim/40 bg-secondary-container/20 p-space-md")}
  >
    {showClose ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss alerts prompt"
        onPress={onNotNow}
        hitSlop={8}
        style={[sx("absolute z-50"), { top: 12, right: 12 }]}
      >
        <X size={18} color={color.onSurfaceVariant} />
      </Pressable>
    ) : null}
    <View style={sx("flex-row items-start gap-space-md")}>
      <View
        style={sx(
          "h-9 w-9 shrink-0 items-center justify-center rounded-full border border-secondary-fixed-dim/30 bg-secondary-container/60",
        )}
      >
        <BellRing size={20} color={color.secondaryFixed} />
      </View>
      <View style={sx("min-w-0 flex-1 gap-space-xs pr-space-md")}>
        <Text style={sx("font-label-bold text-label-lg text-on-surface")}>Turn on Mirra Alerts</Text>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
          Stay on streak, get meal and session nudges inside the app. No phone push yet.
        </Text>
      </View>
    </View>
    <View style={sx("mt-space-md flex-row items-center gap-space-md pl-12")}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enable Mirra Alerts"
        onPress={onEnable}
        style={sx("h-8 items-center justify-center rounded-full bg-primary-fixed px-4")}
      >
        <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>Enable</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={onNotNow} hitSlop={8}>
        <Text style={sx("font-label text-label-md text-on-surface-variant")}>Not now</Text>
      </Pressable>
    </View>
  </View>
);
