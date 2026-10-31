import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly small?: boolean;
  readonly onPress?: () => void;
};

export const TodayIconBtn = ({ label, Icon, small, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    style={sx(`items-center justify-center rounded-full ${small ? "h-8 w-8" : "h-11 w-11"}`)}
  >
    <Icon size={small ? 18 : 22} color={color.onSurface} />
  </Pressable>
);
