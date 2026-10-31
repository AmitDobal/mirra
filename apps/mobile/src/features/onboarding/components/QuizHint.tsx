import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { sx } from "@/theme/sx";

type Props = {
  readonly children: string;
  readonly icon?: ReactNode;
  readonly caption?: string;
};

/** Soft info strip under quiz options (Stitch equipment / goal footers). */
export const QuizHint = ({ children, icon, caption }: Props) => (
  <View
    style={sx(
      "mt-space-lg flex-row items-start gap-space-md rounded-2xl bg-surface-container-low p-space-md",
    )}
  >
    {icon ? (
      <View
        style={sx(
          "h-9 w-9 items-center justify-center rounded-full bg-secondary-container",
        )}
      >
        {icon}
      </View>
    ) : null}
    <View style={sx("flex-1")}>
      <Text style={sx("font-body text-body-sm text-on-surface")}>{children}</Text>
      {caption ? (
        <Text style={sx("mt-1 font-label-bold text-label-caps text-secondary")}>
          {caption}
        </Text>
      ) : null}
    </View>
  </View>
);
