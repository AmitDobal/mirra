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
  /** Pad for the top safe area (default true). Pass false when the screen already insets a fixed header. */
  insetTop?: boolean;
};

/** Safe-area scroll shell used by tab + session screens. */
export const ScreenScroll = ({
  children,
  dockPad = true,
  style,
  onRefresh,
  refreshing = false,
  scrollRef,
  insetTop = true,
}: Props) => {
  const insets = useSafeAreaInsets();
  const bottom = (dockPad ? space.dockClearance : space.xl) + insets.bottom;

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.root, style]}
      contentContainerStyle={{
        paddingTop: (insetTop ? insets.top : 0) + space.lg,
        paddingBottom: bottom,
        paddingHorizontal: space.margin,
      }}
      showsVerticalScrollIndicator={false}
      // Sheets/modals render inside this tree: let taps reach their buttons while the
      // keyboard is up instead of only dismissing it (two-tap Save/Send, AMI-177).
      keyboardShouldPersistTaps="handled"
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
