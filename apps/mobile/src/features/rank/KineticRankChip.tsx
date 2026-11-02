import { Pressable, Text } from "react-native";

import { sx } from "@/theme/sx";

type Props = {
  readonly title: string;
  readonly onPress?: () => void;
};

/** S29 compact rank label beside streak fire. */
export const KineticRankChip = ({ title, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Kinetic rank ${title}`}
    onPress={onPress}
    style={sx("rounded-full border border-outline-variant/40 bg-surface-container-high px-2.5 py-1.5")}
  >
    <Text style={sx("font-label-caps text-label-caps text-on-secondary-container")} numberOfLines={1}>
      {title}
    </Text>
  </Pressable>
);
