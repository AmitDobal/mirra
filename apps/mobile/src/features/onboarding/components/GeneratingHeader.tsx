import { RefreshCw } from "lucide-react-native";
import { MotiView, type MotiTransition } from "moti";
import { StyleSheet, Text, View } from "react-native";
import { Easing } from "react-native-reanimated";

import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius } from "@/theme/tokens";

const SPIN = {
  type: "timing",
  duration: 3000,
  loop: true,
  easing: Easing.linear,
} as MotiTransition;

/** S11 ambient top bar: engine pill (ping dot) + version with spinning sync. */
export const GeneratingHeader = () => {
  const c = onboardingCopy.generating;

  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <View style={styles.pingWrap}>
          <MotiView
            from={{ scale: 1, opacity: 0.85 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={
              { type: "timing", duration: 1000, loop: true } as MotiTransition
            }
            style={styles.ping}
          />
          <View style={styles.pingCore} />
        </View>
        <Text style={styles.pillText}>{c.engine}</Text>
      </View>
      <View style={styles.version}>
        <MotiView
          from={{ rotate: "0deg" }}
          animate={{ rotate: "360deg" }}
          transition={SPIN}
        >
          <RefreshCw size={16} color={color.primaryFixed} />
        </MotiView>
        <Text style={styles.versionText}>{c.version}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
  },
  pingWrap: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ping: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: color.primaryFixed,
  },
  pingCore: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: color.primaryFixed,
  },
  pillText: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: color.primaryFixed,
  },
  version: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  versionText: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.48,
    color: color.onSurfaceVariant,
  },
});
