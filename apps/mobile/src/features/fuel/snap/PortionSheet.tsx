import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { LimeCta } from "@/ui/LimeCta";
import { color, font, radius, space } from "@/theme/tokens";

import { SheetFrame } from "./SheetFrame";
import type { SnapIngredient } from "./snap-model";

type Props = {
  readonly visible: boolean;
  readonly ingredients: readonly SnapIngredient[];
  /** Ingredient to focus when opened from a row; null = Edit All. */
  readonly focusId: string | null;
  readonly onClose: () => void;
  readonly onApply: (grams: Record<string, number>) => void;
};

/** Adjust grams per ingredient; macros rescale. `0` removes the row. */
export const PortionSheet = ({ visible, ingredients, focusId, onClose, onApply }: Props) => {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setValues(
      Object.fromEntries(ingredients.map((i) => [i.id, i.grams === null ? "" : String(i.grams)])),
    );
  }, [visible, ingredients]);

  const handleApply = () => {
    const next: Record<string, number> = {};
    for (const i of ingredients) {
      const raw = (values[i.id] ?? "").trim();
      if (raw === "") continue;
      const n = Math.round(Number(raw));
      if (Number.isFinite(n) && n >= 0 && n <= 5000 && n !== i.grams) next[i.id] = n;
    }
    onApply(next);
    onClose();
  };

  return (
    <SheetFrame visible={visible} title="Adjust portions" onClose={onClose}>
      <Text style={styles.hint}>Macros rescale with grams. Set 0 to remove an item.</Text>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {ingredients.map((i) => (
          <View key={i.id} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {i.name}
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                accessibilityLabel={`${i.name} grams`}
                autoFocus={visible && focusId === i.id}
                keyboardType="number-pad"
                value={values[i.id] ?? ""}
                onChangeText={(t) => setValues((p) => ({ ...p, [i.id]: t.replace(/[^0-9]/g, "") }))}
                placeholder="g"
                placeholderTextColor={color.onSurfaceVariant}
                style={styles.input}
              />
              <Text style={styles.unit}>g</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <LimeCta label="Apply" onPress={handleApply} style={styles.cta} />
    </SheetFrame>
  );
};

const styles = StyleSheet.create({
  hint: { marginTop: space.xs, fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  list: { maxHeight: 320, marginTop: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  name: { flex: 1, fontFamily: font.bodySemi, fontSize: 14, color: color.onSurface },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    width: 108,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHighest,
    paddingHorizontal: 14,
  },
  input: { flex: 1, height: 42, fontFamily: font.label, fontSize: 16, color: color.onSurface },
  unit: { fontFamily: font.label, fontSize: 14, color: color.onSurfaceVariant },
  cta: { marginTop: space.sm },
});
