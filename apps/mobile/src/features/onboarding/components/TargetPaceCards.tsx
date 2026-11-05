import { CheckCircle2, Circle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius, space, type } from "@/theme/tokens";

import type { TargetPaceView } from "../goal-preview";
import type { PaceId } from "../types";

type Props = {
  readonly pace: PaceId;
  readonly view: TargetPaceView;
  readonly onSelect: (pace: PaceId) => void;
};

const PACES: readonly PaceId[] = ["steady", "aggressive"];

/** Stitch S06 pace header ("Target: ~18 weeks") + Steady / Aggressive cards with engine rates. */
export const TargetPaceCards = ({ pace, view, onSelect }: Props) => {
  const c = onboardingCopy.target;
  const hints = c.paceHint[view.direction];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.caps}>{c.pace}</Text>
        {view.weeks !== null ? <Text style={styles.weeks}>{c.targetWeeks(view.weeks)}</Text> : null}
      </View>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {PACES.map((id) => {
          const on = pace === id;
          const rate = view.rates[id];
          const Icon = on ? CheckCircle2 : Circle;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={rate ? `${c[id]}, ${rate}` : c[id]}
              onPress={() => onSelect(id)}
              style={({ pressed }) => [styles.card, on ? styles.cardOn : styles.cardOff, pressed && styles.pressed]}
            >
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: on ? color.onPrimaryContainer : color.onSurface }]}>{c[id]}</Text>
                <Icon
                  size={18}
                  color={on ? color.onPrimaryContainer : color.onSurfaceVariant}
                  style={on ? undefined : styles.dim}
                />
              </View>
              {rate ? (
                <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
                  <Text style={[styles.pillText, { color: on ? color.onPrimaryContainer : color.onSurfaceVariant }]}>
                    {rate}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.hint, { color: on ? color.onPrimaryContainer : color.onSurfaceVariant }]}>
                {hints[id]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {view.minor ? <Text style={styles.minor}>{c.minorPace}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  caps: {
    fontFamily: font.label,
    fontSize: type.labelMd.size,
    lineHeight: type.labelMd.line,
    letterSpacing: type.labelMd.size * 0.08,
    textTransform: "uppercase",
    color: color.onSurfaceVariant,
  },
  weeks: { fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line, color: color.secondary },
  row: { flexDirection: "row", gap: 12 },
  card: { flex: 1, alignItems: "flex-start", gap: space.xs, padding: 14, borderRadius: radius.DEFAULT },
  cardOn: { backgroundColor: color.primaryContainer },
  cardOff: { backgroundColor: color.surfaceContainer },
  pressed: { transform: [{ scale: 0.98 }] },
  titleRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: font.headline, fontSize: type.headlineSm.size, lineHeight: type.headlineSm.line },
  dim: { opacity: 0.4 },
  pill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full },
  // Stitch: on-primary-container at 15 % over lime ≈ primary-fixed-dim.
  pillOn: { backgroundColor: color.primaryFixedDim },
  pillOff: { backgroundColor: color.surfaceContainerHigh },
  pillText: { fontFamily: font.labelBold, fontSize: type.labelCaps.size, lineHeight: type.labelCaps.line },
  hint: { marginTop: space.xs, fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line, opacity: 0.9 },
  minor: { fontFamily: font.body, fontSize: type.bodySm.size, lineHeight: type.bodySm.line, color: color.onSurfaceVariant },
});
