import { MotiView, type MotiTransition } from "moti";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
} from "react-native";

import { s13cPaywallHighlights } from "../../../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const GLOW: MotiTransition = {
  type: "timing",
  duration: 1600,
  loop: true,
  repeatReverse: true,
} as MotiTransition;

const DOT: MotiTransition = {
  type: "timing",
  duration: 900,
  loop: true,
  repeatReverse: true,
} as MotiTransition;

const imageStyle: ImageStyle = {
  width: 96,
  height: 96,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "rgba(203,241,80,0.4)",
};

/** S13c hero — unlock headline + coach tile with lime glow pulse + Live AI pill. */
export const PaywallHero = () => {
  const c = onboardingCopy.paywall;

  return (
    <View
      style={sx(
        "relative flex-row items-center overflow-hidden rounded-[24px] border border-outline-variant/20 bg-surface-container-low p-space-md",
      )}
    >
      <MotiView
        pointerEvents="none"
        from={{ opacity: 0.25 }}
        animate={{ opacity: 0.55 }}
        transition={GLOW}
        style={styles.halo}
      />
      <View style={[sx("min-w-0 flex-1 pr-space-sm"), styles.foreground]}>
        <Text style={sx("font-headline text-headline-lg leading-tight text-primary")}>
          {c.title}
        </Text>
        <Text
          style={sx(
            "mt-space-sm max-w-[210px] font-body text-body-sm leading-relaxed text-on-surface-variant",
          )}
        >
          {c.subtitle}
        </Text>
      </View>
      <View style={[sx("relative shrink-0"), styles.foreground]}>
        <MotiView
          pointerEvents="none"
          from={{ opacity: 0.35 }}
          animate={{ opacity: 0.75 }}
          transition={GLOW}
          style={styles.imageGlow}
        />
        <Image
          source={s13cPaywallHighlights.coachHero}
          accessibilityLabel="Mirra coach"
          resizeMode="cover"
          style={imageStyle}
        />
        <View style={styles.livePill}>
          <MotiView
            from={{ opacity: 0.35 }}
            animate={{ opacity: 1 }}
            transition={DOT}
            style={styles.liveDot}
          />
          <Text style={sx("font-label-bold text-[9px] uppercase text-on-surface")}>
            {c.liveBadge}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  foreground: { zIndex: 10 },
  halo: {
    position: "absolute",
    right: -24,
    bottom: -24,
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: color.primaryFixed,
  },
  imageGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    backgroundColor: color.primaryFixed,
    transform: [{ scale: 0.95 }],
  },
  livePill: {
    position: "absolute",
    bottom: -8,
    left: -8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.primaryFixed,
  },
});
