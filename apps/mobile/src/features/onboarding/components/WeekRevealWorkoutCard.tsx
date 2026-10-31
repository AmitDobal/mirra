import { ChevronDown, ChevronUp, Timer } from "lucide-react-native";
import type { ImageSourcePropType } from "react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { color, font, radius } from "@/theme/tokens";

type Exercise = {
  name: string;
  targetSets: number;
  targetReps: string;
};

type Props = {
  name: string;
  mins: string;
  focusTag: string;
  exerciseCount: number;
  dayLabel: string;
  image: ImageSourcePropType;
  exercises: readonly Exercise[];
  expanded: boolean;
  onToggle: () => void;
  featured?: boolean;
};

/** Stitch `min-h-[148px]`. */
const CARD_H = 148;
/** Stitch `w-36` athlete cutout. */
const PHOTO_W = 144;
/** Stitch `translate-x-2` is emulated by an image 16px wider than the cutout, clipped on the right; no empty gap on the left. */
const PHOTO_SHIFT = 8;
/** Soft fade over the photo's left edge so it blends into the card (no hard seam). */
const SEAM_W = 28;
/** Stitch `pr-28` on the title row keeps text off the photo. */
const TITLE_PAD_RIGHT = 112;

const SeamFade = ({ tint }: { tint: string }) => (
  <Svg width={SEAM_W} height={CARD_H} style={styles.seam} pointerEvents="none">
    <Defs>
      <LinearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0" stopColor={tint} stopOpacity={1} />
        <Stop offset="1" stopColor={tint} stopOpacity={0} />
      </LinearGradient>
    </Defs>
    <Rect x={0} y={0} width={SEAM_W} height={CARD_H} fill="url(#seam)" />
  </Svg>
);

/** S12 workout card — rounded-24, min-h 148, right athlete cutout (Stitch w-36). */
export const WeekRevealWorkoutCard = ({
  name,
  mins,
  focusTag,
  exerciseCount,
  dayLabel,
  image,
  exercises,
  expanded,
  onToggle,
  featured = false,
}: Props) => {
  const cardBg = featured ? color.secondaryContainer : color.surfaceContainer;
  const pillBg = featured ? "rgba(19,19,19,0.8)" : color.surfaceContainerHigh;
  const chipBg = featured ? "rgba(19,19,19,0.7)" : color.surfaceContainerHigh;
  const chipText = featured ? color.primary : color.secondary;

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      {/* Fixed-height cutout so expanding exercises never stretches the photo */}
      <View pointerEvents="none" style={styles.photoWrap}>
        <Image
          source={image}
          accessible={false}
          resizeMode="cover"
          style={styles.photo}
        />
        <SeamFade tint={cardBg} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${mins}. ${expanded ? "Hide" : "Show"} exercises`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.body}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text numberOfLines={2} style={styles.dayLabel}>
              {dayLabel}
            </Text>
            <Text numberOfLines={2} style={styles.title}>
              {name}
            </Text>
          </View>
          <View style={[styles.minsPill, { backgroundColor: pillBg }]}>
            <Timer size={14} color={color.primaryContainer} />
            <Text style={styles.minsText}>{mins}</Text>
          </View>
        </View>

        <View style={styles.chipRow}>
          {focusTag ? (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <Text style={[styles.chipText, { color: chipText }]}>{focusTag}</Text>
            </View>
          ) : null}
          <View style={[styles.chip, { backgroundColor: chipBg }]}>
            <Text style={[styles.chipText, { color: chipText }]}>
              {exerciseCount} exercises
            </Text>
          </View>
          <View style={[styles.chevron, { backgroundColor: chipBg }]}>
            {expanded ? (
              <ChevronUp size={14} color={color.onSurface} />
            ) : (
              <ChevronDown size={14} color={color.onSurface} />
            )}
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.exercises}>
          {exercises.length === 0 ? (
            <Text style={styles.exerciseMeta}>
              Exercises unlock after the plan finishes building.
            </Text>
          ) : (
            exercises.map((ex, i) => (
              <View key={`${ex.name}-${i}`} style={styles.exerciseRow}>
                <Text style={styles.exerciseName}>{ex.name}</Text>
                <Text style={styles.exerciseMeta}>
                  {ex.targetSets}×{ex.targetReps}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
  },
  photoWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    width: PHOTO_W,
    height: CARD_H,
    overflow: "hidden",
  },
  photo: {
    width: PHOTO_W + PHOTO_SHIFT * 2,
    height: CARD_H,
  },
  seam: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  body: {
    minHeight: CARD_H,
    padding: 18,
    justifyContent: "space-between",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingRight: TITLE_PAD_RIGHT - 8,
  },
  titleCol: {
    flex: 1,
  },
  dayLabel: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: color.secondary,
  },
  title: {
    marginTop: 2,
    fontFamily: font.headline,
    fontSize: 18,
    lineHeight: 24,
    color: color.primary,
  },
  minsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  minsText: {
    fontFamily: font.labelBold,
    fontSize: 12,
    lineHeight: 16,
    color: color.primary,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
  },
  chevron: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  exercises: {
    gap: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(69,73,54,0.4)",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 16,
  },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  exerciseName: {
    flex: 1,
    fontFamily: font.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurface,
  },
  exerciseMeta: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurfaceVariant,
  },
});
