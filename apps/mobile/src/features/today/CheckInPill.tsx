import { Zap } from "lucide-react-native";
import { Pressable, Text } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { pressFeedback } from "./press-style";

type Props = {
  readonly onPress: () => void;
};

/** S15c tiny "Check-in · 3 taps" pill. Render only while the daily check-in is due. */
export const CheckInPill = ({ onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Check-in due. Open check-in"
    onPress={onPress}
    style={({ pressed }) => [
      sx("shrink-0 flex-row items-center gap-1 rounded-full border border-primary-fixed px-3 py-1.5"),
      pressFeedback(pressed),
    ]}
  >
    <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>Check-in · 3 taps</Text>
    <Zap size={12} color={color.primaryFixed} fill={color.primaryFixed} />
  </Pressable>
);
