import { StyleSheet, View } from "react-native";

import { color, radius, space } from "@/theme/tokens";

/** S34 loading shell: overall card, toggle, figure stage and group card placeholders. */
export const StrengthSkeleton = () => (
  <View style={styles.root} accessibilityLabel="Loading strength tiers" accessible>
    <View style={styles.card} />
    <View style={styles.toggle} />
    <View style={styles.figure} />
    <View style={styles.rows} />
  </View>
);

const block = {
  borderWidth: 1,
  borderColor: color.surfaceContainerHigh,
  backgroundColor: color.surfaceContainerLow,
} as const;

const styles = StyleSheet.create({
  root: { paddingHorizontal: space.margin, paddingTop: space.sm, gap: space.lg },
  card: { ...block, height: 128, borderRadius: 28 },
  toggle: { ...block, height: space.touch, borderRadius: radius.full },
  figure: { height: 300, marginHorizontal: 80, borderRadius: radius.lg, backgroundColor: color.surfaceContainerLow },
  rows: { ...block, height: 168, borderRadius: radius.md },
});
