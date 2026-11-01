import { ChevronLeft, ScanLine } from "lucide-react-native";
import { MotiText, MotiView } from "moti";
import { Easing } from "react-native-reanimated";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GeneratingShimmerBar } from "@/features/onboarding/components/GeneratingShimmerBar";
import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";
import { timing } from "./motion";

const STATUSES = [
  "Reading the plate…",
  "Detecting ingredients…",
  "Estimating portions…",
  "Balancing macros…",
] as const;

const RING = 148;
const EDGE = 18;
const BRACKETS = {
  tl: { top: -EDGE, left: -EDGE, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: -EDGE, right: -EDGE, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: -EDGE, left: -EDGE, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: -EDGE, right: -EDGE, borderBottomWidth: 2, borderRightWidth: 2 },
} as const;

/** Eases toward 92% so the ring never claims "done" before the API answers. */
const useFakeProgress = (): number => {
  const [pct, setPct] = useState(4);
  useEffect(() => {
    const id = setInterval(() => setPct((p) => p + (92 - p) * 0.07), 350);
    return () => clearInterval(id);
  }, []);
  return Math.round(pct);
};

const useRotatingStatus = (): string => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % STATUSES.length), 1600);
    return () => clearInterval(id);
  }, []);
  return STATUSES[i]!;
};

type Props = {
  readonly photoUri: string | null;
  readonly targetKcal: number;
  readonly onCancel: () => void;
};

/** S19b analyzing — photo backdrop, scanning reticle, rotating status, shimmer targets. */
export const AnalyzingView = ({ photoUri, targetKcal, onCancel }: Props) => {
  const insets = useSafeAreaInsets();
  const pct = useFakeProgress();
  const status = useRotatingStatus();

  return (
    <View style={styles.root}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} />

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel analysis"
          onPress={onCancel}
          style={styles.iconBtn}
        >
          <ChevronLeft size={22} color={color.onSurface} />
        </Pressable>
        <View style={styles.pill}>
          <View style={styles.dot} />
          <CapsLabel style={{ color: color.onSurface }}>Mirra Vision</CapsLabel>
        </View>
        <View style={styles.iconBtnGhost} />
      </View>

      <View style={styles.center}>
        <View style={styles.reticle}>
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <View key={pos} pointerEvents="none" style={[styles.bracket, BRACKETS[pos]]} />
          ))}
          <MotiView
            from={{ rotate: "0deg" }}
            animate={{ rotate: "360deg" }}
            transition={timing({ duration: 9000, loop: true, easing: Easing.linear })}
            style={StyleSheet.absoluteFill}
          >
            <Svg width={RING} height={RING}>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING / 2 - 4}
                stroke={color.onSurfaceVariant}
                strokeOpacity={0.55}
                strokeWidth={1.5}
                strokeDasharray="4 7"
                fill="none"
              />
            </Svg>
          </MotiView>
          <MotiView
            from={{ opacity: 0.6, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1.02 }}
            transition={timing({ duration: 1100, loop: true, repeatReverse: true })}
            style={styles.core}
          >
            <ScanLine size={22} color={color.primaryFixed} />
            <Text style={styles.pct}>{`${pct}%`}</Text>
          </MotiView>
        </View>

        <Text style={styles.title}>ANALYZING MACROS</Text>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <MotiText
            key={status}
            from={{ opacity: 0, translateY: 6 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={timing({ duration: 280 })}
            style={styles.status}
          >
            {status}
          </MotiText>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <CapsLabel>Multi-spectrum ingest</CapsLabel>
          <CapsLabel tone="lime">Scanning</CapsLabel>
        </View>
        <View style={styles.chips}>
          {[96, 124, 88].map((w, i) => (
            <GeneratingShimmerBar
              key={w}
              width={w}
              height={28}
              delay={i * 180}
              baseColor={color.surfaceContainerHigh}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.foot, { marginBottom: insets.bottom + space.md }]}>
        {targetKcal > 0
          ? `Calibrated against your ${targetKcal.toLocaleString()} kcal daily target`
          : "Calibrated against your plan"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surfaceContainerLowest },
  scrim: { backgroundColor: "rgba(14,14,14,0.62)" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.margin,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  iconBtnGhost: { width: 44, height: 44 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.margin,
  },
  reticle: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  bracket: { position: "absolute", width: 20, height: 20, borderColor: color.primaryFixed },
  core: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: color.primaryFixed,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(14,14,14,0.55)",
  },
  pct: { fontFamily: font.label, fontSize: 13, color: color.primaryFixed },
  title: {
    marginTop: space.lg,
    fontFamily: font.display,
    fontSize: 22,
    letterSpacing: 0.6,
    color: color.onSurface,
  },
  statusRow: { marginTop: space.sm, flexDirection: "row", alignItems: "center", gap: 8 },
  status: { fontFamily: font.bodySemi, fontSize: 14, color: color.primaryFixed },
  track: {
    marginTop: space.md,
    width: 160,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  fill: { height: 3, borderRadius: 2, backgroundColor: color.primaryFixed },
  card: {
    marginHorizontal: space.margin,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    padding: space.md,
    gap: space.sm,
  },
  cardHead: { flexDirection: "row", justifyContent: "space-between" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  foot: {
    marginTop: space.sm,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: 11,
    color: color.onSurfaceVariant,
  },
});
