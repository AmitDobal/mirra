import { Sparkles } from "lucide-react-native";
import { Image, StyleSheet, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";

type Props = {
  readonly photoUri: string | null;
  readonly name: string;
  readonly description: string;
};

const Corner = ({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) => (
  <View
    pointerEvents="none"
    style={[
      styles.corner,
      pos[0] === "t" ? { top: 10 } : { bottom: 10 },
      pos[1] === "l" ? { left: 10 } : { right: 10 },
      pos[0] === "t" ? styles.cTop : styles.cBottom,
      pos[1] === "l" ? styles.cLeft : styles.cRight,
    ]}
  />
);

/** Vision ingest frame: photo with lime brackets, or the described text. */
export const PhotoCard = ({ photoUri, name, description }: Props) => (
  <View style={styles.card}>
    {photoUri ? (
      <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
    ) : (
      <View style={styles.textOnly}>
        <Text style={styles.quote} numberOfLines={3}>
          {description ? `“${description}”` : name}
        </Text>
      </View>
    )}
    <View style={styles.chip}>
      <Sparkles size={11} color={color.primaryFixed} />
      <CapsLabel tone="lime" numberOfLines={1} style={styles.chipText}>
        {photoUri ? `Vision ingest · ${name}` : "From your description"}
      </CapsLabel>
    </View>
    <Corner pos="tl" />
    <Corner pos="tr" />
    <Corner pos="bl" />
    <Corner pos="br" />
  </View>
);

const styles = StyleSheet.create({
  card: {
    height: 148,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    marginBottom: space.md,
  },
  textOnly: { flex: 1, justifyContent: "center", paddingHorizontal: space.lg, paddingTop: 20 },
  quote: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22, color: color.onSurface },
  chip: {
    position: "absolute",
    top: 10,
    left: 10,
    maxWidth: "80%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(14,14,14,0.72)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: { flexShrink: 1 },
  corner: { position: "absolute", width: 16, height: 16, borderColor: color.primaryFixed },
  cTop: { borderTopWidth: 2 },
  cBottom: { borderBottomWidth: 2 },
  cLeft: { borderLeftWidth: 2 },
  cRight: { borderRightWidth: 2 },
});
