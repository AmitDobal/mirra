import { StyleSheet, Text, View } from "react-native";

import { color, font, radius } from "@/theme/tokens";

import { alpha, hairline } from "./proposal-styles";

type Props = {
  readonly label: string;
  /** `tag`: lavender outline (S39 "Same muscles"). `kcal`: neutral filled ("640 kcal"). */
  readonly tone?: "tag" | "kcal";
};

/** S39 pill on the right of a before / after line. */
export const DiffTag = ({ label, tone = "tag" }: Props) => (
  <View style={[styles.pill, tone === "kcal" ? styles.kcal : styles.tag]}>
    <Text style={[styles.text, tone === "kcal" ? styles.kcalText : styles.tagText]} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexShrink: 0,
    marginLeft: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tag: { borderColor: alpha(color.secondary, 0.4) },
  kcal: { borderColor: hairline, backgroundColor: color.surfaceContainer },
  text: { fontFamily: font.label, fontSize: 11, lineHeight: 16 },
  tagText: { color: color.secondary },
  kcalText: { color: color.onSurfaceVariant },
});
