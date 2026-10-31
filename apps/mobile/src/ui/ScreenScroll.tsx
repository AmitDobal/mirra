import type { ReactNode, Ref } from "react";
import {
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, space } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  /** Extra bottom pad for floating TabDock (default true). */
  dockPad?: boolean;
  style?: StyleProp<ViewStyle>;
  /** When set, enables pull-to-refresh. */
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  scrollRef?: Ref<ScrollViewInstance>;
};

/** Safe-area scroll shell used by tab + session screens. */
export const ScreenScroll = ({
  children,
  dockPad = true,
  style,
  onRefresh,
  refreshing = false,
  scrollRef,
}: Props) => {
  const insets = useSafeAreaInsets();
  const bottom = (dockPad ? space.dockClearance : space.xl) + insets.bottom;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.root, style]}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingBottom: bottom,
        paddingHorizontal: space.margin,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor={color.primaryFixed}
            colors={[color.primaryFixed]}
            progressBackgroundColor={color.surfaceContainerHigh}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
};

type FixedProps = {
  children: ReactNode;
  dockPad?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Non-scrolling full-screen shell (live HUD, etc.). */
export const ScreenFixed = ({
  children,
  dockPad = false,
  style,
}: FixedProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.md,
          paddingBottom:
            (dockPad ? space.dockClearance : space.lg) + insets.bottom,
          paddingHorizontal: space.margin,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface,
  },
});
