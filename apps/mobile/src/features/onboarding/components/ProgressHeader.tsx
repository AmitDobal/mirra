import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color, space } from "@/theme/tokens";

type ProgressHeaderProps = {
  step: number;
  total?: number;
  onBack: () => void;
};

/** Quiz chrome: back + step label + lime progress fill. */
export const ProgressHeader = ({
  step,
  total = 9,
  onBack,
}: ProgressHeaderProps) => {
  const fill = Math.min(1, Math.max(0, step / total));

  return (
    <View style={sx("gap-space-sm")}>
      <View style={sx("flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          style={sx("h-touch w-touch items-center justify-center")}
        >
          <ChevronLeft color={color.onSurface} size={24} />
        </Pressable>
        <Text style={sx("font-label text-label-md text-primary-fixed")}>
          {step} / {total}
        </Text>
        <View style={{ width: space.touch }} />
      </View>
      <View style={sx("h-1 overflow-hidden rounded-full bg-surface-container-highest")}>
        <View
          style={[
            sx("h-full rounded-full bg-primary-fixed"),
            { width: `${fill * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};
