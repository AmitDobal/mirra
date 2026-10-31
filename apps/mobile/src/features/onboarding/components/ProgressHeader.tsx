import { ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type ProgressHeaderProps = {
  step: number;
  total?: number;
  onBack: () => void;
};

/** Quiz chrome: back + step pill + MIRRA AI + lime progress fill. */
export const ProgressHeader = ({
  step,
  total = 12,
  onBack,
}: ProgressHeaderProps) => {
  const fill = Math.min(1, Math.max(0, step / total));

  return (
    <View style={sx("gap-space-sm")}>
      <View style={sx("flex-row items-center justify-between gap-space-sm")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          style={sx(
            "h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container",
          )}
        >
          <ChevronLeft color={color.onSurface} size={20} />
        </Pressable>
        <View
          style={sx(
            "min-w-0 flex-row items-center gap-1.5 rounded-full border border-outline-variant/20 bg-surface-container px-2.5 py-1",
          )}
        >
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: color.primaryFixed,
            }}
          />
          <Text
            numberOfLines={1}
            style={sx("font-label-bold text-[10px] leading-3 tracking-wide text-on-surface")}
          >
            {`STEP ${step} / ${total}`}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={sx(
            "shrink-0 font-label-bold text-[10px] leading-3 tracking-wide text-on-surface-variant",
          )}
        >
          MIRRA AI
        </Text>
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
