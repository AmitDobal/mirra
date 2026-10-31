import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

export type DayStripItem = {
  letter: string;
  num: number;
  tag: string;
  lift: boolean;
};

/** S12 week strip — every lift day uses the primary circle (from plan data). */
export const WeekRevealDayStrip = ({ days }: { days: readonly DayStripItem[] }) => (
  <View style={styles.strip}>
    {days.map((day, i) => (
      <View key={`${day.letter}-${day.num}-${i}`} style={styles.col}>
        <View style={styles.top}>
          {day.lift ? (
            <View style={styles.liftCircle}>
              <Text style={styles.liftLetter}>{day.letter}</Text>
              <Text style={styles.liftNum}>{day.num}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.letter}>{day.letter}</Text>
              <Text style={styles.num}>{day.num}</Text>
            </>
          )}
        </View>
        <View style={[styles.tagPill, day.lift ? null : styles.tagPillMuted]}>
          <Text style={[styles.tagText, day.lift ? styles.tagLift : styles.tagMuted]}>
            {day.tag}
          </Text>
        </View>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 20,
    backgroundColor: color.surfaceContainer,
    padding: 12,
  },
  col: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  top: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  letter: {
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    color: color.onSurfaceVariant,
  },
  num: {
    fontFamily: font.label,
    fontSize: 12,
    lineHeight: 16,
    color: color.primary,
  },
  liftCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: color.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: color.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  liftLetter: {
    fontFamily: font.labelBold,
    fontSize: 9,
    lineHeight: 10,
    textTransform: "uppercase",
    color: color.onPrimaryFixed,
  },
  liftNum: {
    fontFamily: font.labelBold,
    fontSize: 12,
    lineHeight: 14,
    color: color.onPrimaryFixed,
  },
  tagPill: {
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagPillMuted: {
    backgroundColor: color.surfaceContainerHigh,
  },
  tagText: {
    fontFamily: font.label,
    fontSize: 9,
    lineHeight: 12,
  },
  tagLift: {
    fontFamily: font.labelBold,
    color: color.primaryContainer,
  },
  tagMuted: {
    color: color.secondary,
  },
});
