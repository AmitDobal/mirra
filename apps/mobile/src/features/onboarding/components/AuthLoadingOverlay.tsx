import { useEffect, useRef } from "react";
import { Animated, Easing, Modal, StyleSheet, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius, space, type } from "@/theme/tokens";

type Props = {
  readonly visible: boolean;
};

const SPINNER = 64;
const SCRIM = "rgba(0,0,0,0.78)";

/** Lime arc rotating over a faint ring (S14b). */
const Spinner = () => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.spinnerWrap}>
      <View style={styles.ring} />
      <Animated.View style={[styles.arc, { transform: [{ rotate: spin }] }]} />
      <View style={styles.core} />
    </View>
  );
};

/**
 * S14b — blocking scrim while Google sign-in runs. A transparent `Modal` swallows
 * every touch and the Android back button (`onRequestClose` is a no-op), so the
 * user stays on the auth screen until the flow returns.
 */
export const AuthLoadingOverlay = ({ visible }: Props) => {
  const c = onboardingCopy.auth;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => undefined}
    >
      <View
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
        style={styles.scrim}
      >
        <View style={styles.card}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{c.loadingBadge}</Text>
          </View>
          <Spinner />
          <Text style={styles.title}>{c.loadingTitle}</Text>
          <Text style={styles.body}>{c.loadingBody}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl - space.sm,
    backgroundColor: SCRIM,
  },
  card: {
    width: "100%",
    maxWidth: 330,
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: `${color.onSurface}1A`,
    backgroundColor: color.surfaceContainerLow,
    padding: space.xl,
    shadowColor: color.primaryFixed,
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm - 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: `${color.onSurface}1A`,
    backgroundColor: `${color.onSurface}0D`,
    paddingHorizontal: space.md - 4,
    paddingVertical: space.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: color.primaryFixed,
  },
  liveText: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: `${color.onSurface}CC`,
  },
  spinnerWrap: {
    width: SPINNER,
    height: SPINNER,
    marginTop: space.xl - space.sm,
    marginBottom: space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: `${color.onSurface}1A`,
  },
  arc: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    borderWidth: 4.5,
    borderColor: "transparent",
    borderTopColor: color.primaryFixed,
    borderRightColor: color.primaryFixed,
  },
  core: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: `${color.primaryFixed}33`,
  },
  title: {
    marginTop: space.md - 4,
    fontFamily: font.headline,
    fontSize: type.headlineMd.size,
    lineHeight: type.headlineMd.line,
    letterSpacing: -0.2,
    color: color.onSurface,
    textAlign: "center",
  },
  body: {
    maxWidth: 240,
    marginTop: space.sm - 2,
    fontFamily: font.bodyMedium,
    fontSize: type.bodyMd.size,
    lineHeight: type.bodyMd.line + 2,
    color: color.onSurfaceVariant,
    textAlign: "center",
  },
});
