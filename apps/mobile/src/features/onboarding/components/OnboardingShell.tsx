import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { space } from "@/theme/tokens";

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
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top + space.sm,
        paddingBottom: insets.bottom + space.md,
      }}
    >
      {header ? <View className="px-margin">{header}</View> : null}
      {scroll ? (
        <ScrollView
          className="flex-1 px-margin"
          contentContainerClassName="pb-space-xl grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1 px-margin">{children}</View>
      )}
      {footer ? (
        <View className="gap-space-sm px-margin pt-space-sm">{footer}</View>
      ) : null}
    </View>
  );
};
