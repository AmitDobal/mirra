import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { color, space } from "@/theme/tokens";

type ProgressHeaderProps = {
  step: number;
  total?: number;
  onBack: () => void;
};

/** Quiz chrome: back + step label + lime progress fill. */
export const ProgressHeader = ({
  step,
  total = 8,
  onBack,
}: ProgressHeaderProps) => {
  const fill = Math.min(1, Math.max(0, step / total));

  return (
    <View className="gap-space-sm">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          className="h-touch w-touch items-center justify-center"
        >
          <ChevronLeft color={color.onSurface} size={24} />
        </Pressable>
        <Text className="font-label text-label-md text-primary-fixed">
          {step} / {total}
        </Text>
        <View style={{ width: space.touch }} />
      </View>
      <View className="h-1 overflow-hidden rounded-full bg-surface-container-highest">
        <View
          className="h-full rounded-full bg-primary-fixed"
          style={{ width: `${fill * 100}%` }}
        />
      </View>
    </View>
  );
};
