import type { Flame } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

/** S16 HUD building blocks (split from LiveWorkoutScreen for the 300-line cap). */
export const formatClock = (sec: number) => {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
};

export const HudChip = ({
  Icon,
  value,
  label,
}: {
  Icon: typeof Flame;
  value: string;
  label?: string;
}) => (
  <View style={sx("flex-1 flex-row items-center gap-space-sm rounded-lg bg-surface-container-high px-space-md py-space-sm")}>
    <Icon size={18} color={color.primaryFixed} />
    <View>
      {label ? <CapsLabel>{label}</CapsLabel> : null}
      <Text style={sx("font-label-bold text-label-lg text-on-surface")}>{value}</Text>
    </View>
  </View>
);

export const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <View>
    <CapsLabel>{label}</CapsLabel>
    <View style={sx("flex-row items-baseline gap-1")}>
      <Text style={sx("font-headline text-headline-md text-on-surface")}>{value}</Text>
      {sub ? (
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{sub}</Text>
      ) : null}
    </View>
  </View>
);

export const TextLink = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
    <Text style={sx("font-label text-label-md text-on-surface-variant")}>{label}</Text>
  </Pressable>
);
