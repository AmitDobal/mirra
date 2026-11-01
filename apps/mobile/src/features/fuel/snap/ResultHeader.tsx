import { X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";

type Props = {
  readonly confidence: number;
  readonly low: boolean;
  readonly retakeLabel: string;
  readonly onClose: () => void;
  readonly onRetake: () => void;
};

/** S19b header: close, title, confidence pill, retake. */
export const ResultHeader = ({ confidence, low, retakeLabel, onClose, onRetake }: Props) => (
  <View style={styles.row}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close meal analysis"
      onPress={onClose}
      style={styles.close}
    >
      <X size={20} color={color.onSurface} />
    </Pressable>
    <View style={styles.titles}>
      <Text style={styles.title}>Meal Analysis</Text>
      <Text style={styles.sub}>Mirra Vision</Text>
    </View>
    <View style={[styles.pill, low && styles.pillLow]}>
      <View style={[styles.dot, low && styles.dotLow]} />
      <CapsLabel
        tone={low ? "alert" : "lime"}
      >{`${Math.round(confidence * 100)}% confidence`}</CapsLabel>
    </View>
    <Pressable accessibilityRole="button" onPress={onRetake} hitSlop={8}>
      <Text style={styles.retake}>{retakeLabel}</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  titles: { flex: 1 },
  title: { fontFamily: font.headline, fontSize: 17, color: color.onSurface },
  sub: { fontFamily: font.body, fontSize: 11, color: color.onSurfaceVariant },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.primaryFixedDim,
    backgroundColor: color.surfaceContainerLow,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pillLow: { borderColor: color.error },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed },
  dotLow: { backgroundColor: color.error },
  retake: { fontFamily: font.labelBold, fontSize: 13, color: color.primaryFixed },
});
