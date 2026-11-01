import { Sparkles, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { color, font, radius, space } from "@/theme/tokens";

const EXAMPLES = [
  "Chicken rice bowl",
  "Protein smoothie with banana",
  "2 eggs, toast, avocado",
] as const;

type Props = {
  readonly initial: string;
  readonly onSubmit: (text: string) => void;
  readonly onClose: () => void;
};

/** Describe-only entry: type the meal, Mirra estimates it. */
export const DescribeView = ({ initial, onSubmit, onClose }: Props) => {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(initial);
  const ready = text.trim().length > 1;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.close}
        >
          <X size={20} color={color.onSurface} />
        </Pressable>
        <Text style={styles.title}>Describe meal</Text>
        <View style={styles.closeGap} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Sparkles size={14} color={color.primaryFixed} />
          <CapsLabel tone="lime">What did you eat?</CapsLabel>
        </View>
        <TextInput
          accessibilityLabel="Meal description"
          autoFocus
          multiline
          value={text}
          onChangeText={setText}
          placeholder="e.g. grilled chicken, jasmine rice, avocado"
          placeholderTextColor={color.onSurfaceVariant}
          style={styles.input}
        />
        <View style={styles.examples}>
          {EXAMPLES.map((e) => (
            <Pressable
              key={e}
              accessibilityRole="button"
              onPress={() => setText(e)}
              style={styles.example}
            >
              <Text style={styles.exampleText}>{e}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.spacer} />
      <LimeCta
        label="Analyze meal"
        onPress={() => ready && onSubmit(text.trim())}
        style={ready ? undefined : styles.disabled}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface, paddingHorizontal: space.margin },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.lg,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  closeGap: { width: 40, height: 40 },
  title: { fontFamily: font.headline, fontSize: 18, color: color.onSurface },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    padding: space.md,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: {
    minHeight: 110,
    marginTop: space.sm,
    textAlignVertical: "top",
    fontFamily: font.bodyMedium,
    fontSize: 17,
    lineHeight: 24,
    color: color.onSurface,
  },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  example: {
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exampleText: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  spacer: { flex: 1 },
  disabled: { opacity: 0.45 },
});
