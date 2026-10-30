import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  /** Extra bottom pad for floating TabDock (default true). */
  dockPad?: boolean;
  className?: string;
};

/** Safe-area scroll shell used by tab + session screens. */
export const ScreenScroll = ({
  children,
  dockPad = true,
  className = "",
}: Props) => {
  const insets = useSafeAreaInsets();
  const bottom = (dockPad ? space.dockClearance : space.xl) + insets.bottom;

  return (
    <ScrollView
      className={`flex-1 bg-surface ${className}`}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingBottom: bottom,
        paddingHorizontal: space.margin,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
};

type FixedProps = {
  children: ReactNode;
  dockPad?: boolean;
  className?: string;
};

/** Non-scrolling full-screen shell (live HUD, etc.). */
export const ScreenFixed = ({
  children,
  dockPad = false,
  className = "",
}: FixedProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 bg-surface ${className}`}
      style={{
        paddingTop: insets.top + space.md,
        paddingBottom: (dockPad ? space.dockClearance : space.lg) + insets.bottom,
        paddingHorizontal: space.margin,
      }}
    >
      {children}
    </View>
  );
};
