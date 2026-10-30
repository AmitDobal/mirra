import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, space } from "@/theme/tokens";

type OnboardingShellProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
};

/** Safe-area shell with optional sticky footer for quiz CTAs. */
export const OnboardingShell = ({
  header,
  footer,
  children,
  scroll = true,
}: OnboardingShellProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.md,
        },
      ]}
    >
      {header ? <View style={styles.pad}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.pad]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.background,
  },
  flex: {
    flex: 1,
  },
  pad: {
    paddingHorizontal: space.margin,
  },
  scrollContent: {
    paddingHorizontal: space.margin,
    paddingBottom: space.xl,
    flexGrow: 1,
  },
  footer: {
    gap: space.sm,
    paddingHorizontal: space.margin,
    paddingTop: space.sm,
  },
});
