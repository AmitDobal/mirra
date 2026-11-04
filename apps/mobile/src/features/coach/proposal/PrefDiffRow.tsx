import { CheckCircle2 } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font } from "@/theme/tokens";

import { DiffTag } from "./DiffTag";
import { blockStyle } from "./proposal-styles";

type Props = { readonly text: string; readonly tags: readonly string[] };

/** S39 compact row: one explicit statement ("Avoid: chicken"), no fake before. */
export const PrefDiffRow = ({ text, tags }: Props) => (
  <View style={styles.block}>
    <View style={styles.main}>
      <CheckCircle2 size={18} color={color.primaryFixed} />
      <Text style={styles.text}>{text}</Text>
    </View>
    {tags.map((t) => (
      <DiffTag key={t} label={t} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  block: { ...blockStyle, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  main: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  text: { flexShrink: 1, fontFamily: font.label, fontSize: 13, lineHeight: 18, color: color.onSurface },
});
