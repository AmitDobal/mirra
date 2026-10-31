import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius } from "@/theme/tokens";

import { GeneratingDayStrip } from "./GeneratingDayStrip";
import { GeneratingSplitCards } from "./GeneratingSplitCards";

type Props = {
  percent: number;
  finalStep: boolean;
};

const GLOW = 224;

/** Stitch `blur-3xl` blobs approximated with radial gradients. */
const Glow = ({
  id,
  tint,
  opacity,
  style,
}: {
  id: string;
  tint: string;
  opacity: number;
  style: object;
}) => (
  <Svg width={GLOW} height={GLOW} style={[styles.glow, style]} pointerEvents="none">
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={tint} stopOpacity={opacity} />
        <Stop offset="1" stopColor={tint} stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Rect width={GLOW} height={GLOW} fill={`url(#${id})`} />
  </Svg>
);

const BAR_H = 6;

/** Gradient fill is sized in px so the gradient always spans the filled part. */
const ProgressTrack = ({ percent }: { percent: number }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const handleLayout = (e: LayoutChangeEvent) =>
    setTrackWidth(e.nativeEvent.layout.width);
  const fillWidth = Math.round((trackWidth * percent) / 100);

  return (
    <View style={styles.track} onLayout={handleLayout}>
      <Svg width={fillWidth} height={BAR_H}>
        <Defs>
          <LinearGradient id="s11bar" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color.secondary} />
            <Stop offset="0.5" stopColor={color.primaryFixed} />
            <Stop offset="1" stopColor={color.primaryContainer} />
          </LinearGradient>
        </Defs>
        <Rect
          width={fillWidth}
          height={BAR_H}
          rx={BAR_H / 2}
          fill="url(#s11bar)"
        />
      </Svg>
    </View>
  );
};

/** S11 hero card: blueprint header, week strip, split skeletons, load meter. */
export const GeneratingBlueprintCard = ({ percent, finalStep }: Props) => {
  const c = onboardingCopy.generating;

  return (
    <View style={styles.card}>
      <Glow
        id="s11glowA"
        tint={color.primaryFixed}
        opacity={0.18}
        style={styles.glowTopRight}
      />
      <Glow
        id="s11glowB"
        tint={color.secondary}
        opacity={0.22}
        style={styles.glowBottomLeft}
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>{c.blueprintKicker.toUpperCase()}</Text>
          <Text style={styles.title}>{c.blueprintTitle}</Text>
        </View>
        <View style={styles.percentPill}>
          <View style={styles.percentDot} />
          <Text style={styles.percentText}>{percent}%</Text>
        </View>
      </View>

      <View style={styles.strip}>
        <GeneratingDayStrip />
      </View>

      <GeneratingSplitCards />

      <View style={styles.meter}>
        <View style={styles.meterRow}>
          <View style={styles.meterLabelRow}>
            <View style={styles.meterDot} />
            <Text style={styles.meterLabel}>{c.meterLabel}</Text>
          </View>
          <Text style={styles.meterStep}>{finalStep ? c.stepFinal : c.stepLabel}</Text>
        </View>
        <ProgressTrack percent={percent} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 20,
    borderRadius: radius.lg,
    backgroundColor: color.surfaceContainerLow,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 25 },
  },
  glow: {
    position: "absolute",
  },
  glowTopRight: {
    top: -64,
    right: -64,
  },
  glowBottomLeft: {
    bottom: -64,
    left: -64,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  kicker: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: color.onSurfaceVariant,
  },
  title: {
    fontFamily: font.headlineSemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
    color: color.primary,
  },
  percentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHighest,
  },
  percentDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.secondary,
  },
  percentText: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.48,
    color: color.secondary,
  },
  strip: {
    marginBottom: 20,
  },
  meter: {
    marginTop: 20,
    paddingTop: 16,
    gap: 8,
  },
  meterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meterLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meterDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: color.primaryFixed,
  },
  meterLabel: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    color: color.onSurfaceVariant,
  },
  meterStep: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    color: color.primary,
  },
  track: {
    width: "100%",
    height: BAR_H,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHighest,
    overflow: "hidden",
  },
});
