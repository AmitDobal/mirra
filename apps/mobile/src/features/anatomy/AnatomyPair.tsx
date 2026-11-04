/**
 * Front + back anatomy. `layout="pair"`: side by side with captions (S36).
 * `layout="toggle"`: one figure under a Front / Back segmented control (S34).
 */
import { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { color, font, radius, space } from "@/theme/tokens";

import { AnatomyFigure } from "./AnatomyFigure";
import type { MuscleId } from "./muscle-ids";
import type { AnatomySex, AnatomySide } from "./paths";
import type { AnatomyMode } from "./region-fill";

export type AnatomyPairProps = {
  readonly sex: AnatomySex | null | undefined;
  readonly mode: AnatomyMode;
  /** Height of each figure in pt. */
  readonly height: number;
  readonly layout?: "pair" | "toggle";
  /** Toggle layout only: side shown first. */
  readonly initialSide?: AnatomySide;
  /** Pair layout only: "Front" / "Back" captions under each figure. */
  readonly captions?: boolean;
  readonly onPressMuscle?: (ids: readonly MuscleId[]) => void;
  readonly style?: StyleProp<ViewStyle>;
};

const SIDES: readonly AnatomySide[] = ["front", "back"];
const SIDE_LABEL: Record<AnatomySide, string> = { front: "Front", back: "Back" };

export const AnatomyPair = memo(function AnatomyPair({
  sex,
  mode,
  height,
  layout = "pair",
  initialSide = "front",
  captions = true,
  onPressMuscle,
  style,
}: AnatomyPairProps) {
  const [side, setSide] = useState<AnatomySide>(initialSide);

  if (layout === "toggle") {
    return (
      <View style={[styles.toggleWrap, style]}>
        <View style={styles.track} accessibilityRole="tablist">
          {SIDES.map((s) => {
            const active = s === side;
            return (
              <Pressable
                key={s}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSide(s)}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {SIDE_LABEL[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.stage, { height }]}>
          <AnatomyFigure sex={sex} side={side} mode={mode} height={height} onPressMuscle={onPressMuscle} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.pair, style]}>
      {SIDES.map((s) => (
        <View key={s} style={styles.column}>
          <View style={[styles.stage, { height }]}>
            <AnatomyFigure sex={sex} side={s} mode={mode} height={height} onPressMuscle={onPressMuscle} />
          </View>
          {captions ? <Text style={styles.caption}>{SIDE_LABEL[s]}</Text> : null}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: space.md, paddingTop: space.sm },
  column: { flex: 1, alignItems: "center" },
  stage: { width: "100%", alignItems: "center", justifyContent: "center" },
  caption: {
    marginTop: space.sm,
    fontFamily: font.headlineSemi,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurfaceVariant,
  },
  toggleWrap: { width: "100%", gap: 12 },
  track: {
    height: space.touch,
    flexDirection: "row",
    alignItems: "center",
    padding: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  segment: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  segmentActive: { backgroundColor: color.primary },
  segmentText: {
    fontFamily: font.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: color.onSurfaceVariant,
  },
  segmentTextActive: { fontFamily: font.bodySemi, color: color.background },
});
