import { Text, View } from "react-native";

import { sx } from "@/theme/sx";

/** Lime caps section label above quiz titles — compact so long labels stay inside the pill. */
export const QuizEyebrow = ({ label }: { label: string }) => (
  <View
    style={sx(
      "mb-space-sm mt-space-md max-w-full self-start rounded-full bg-primary-fixed/15 px-2.5 py-1",
    )}
  >
    <Text
      numberOfLines={1}
      style={sx(
        "font-label-bold text-[10px] leading-3 tracking-wide text-primary-fixed",
      )}
    >
      {label.toUpperCase()}
    </Text>
  </View>
);
