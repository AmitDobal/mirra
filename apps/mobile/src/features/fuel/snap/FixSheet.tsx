import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import type { MealSlot } from "@/lib/api";
import { CapsLabel } from "@/ui/CapsLabel";
import { Chip } from "@/ui/Chip";
import { LimeCta } from "@/ui/LimeCta";
import { color, font, radius, space } from "@/theme/tokens";

import { SheetFrame } from "./SheetFrame";
import { capitalize } from "./snap-model";

const SLOTS: readonly MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export type FixValues = {
  readonly name: string;
  readonly slot: MealSlot;
  readonly kcal: number;
};

type Props = {
  readonly visible: boolean;
  readonly initial: FixValues;
  readonly lowConfidence: boolean;
  readonly onClose: () => void;
  readonly onApply: (values: FixValues) => void;
  /** Ask the model again with the user's note ("with dressing on the side"). */
  readonly onRefine: (note: string) => void;
};

/** Fix results: rename, change meal, override kcal, or re-run vision with a note. */
export const FixSheet = ({
  visible,
  initial,
  lowConfidence,
  onClose,
  onApply,
  onRefine,
}: Props) => {
  const [name, setName] = useState(initial.name);
  const [kcal, setKcal] = useState(String(initial.kcal));
  const [slot, setSlot] = useState<MealSlot>(initial.slot);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName(initial.name);
    setKcal(String(initial.kcal));
    setSlot(initial.slot);
    setNote("");
  }, [visible, initial]);

  const handleApply = () => {
    const n = Math.round(Number(kcal));
    onApply({
      name: name.trim() || initial.name,
      slot,
      kcal: Number.isFinite(n) && n > 0 ? n : initial.kcal,
    });
    onClose();
  };

  const handleRefine = () => {
    if (!note.trim()) return;
    onClose();
    onRefine(note.trim());
  };

  return (
    <SheetFrame visible={visible} title="Fix results" onClose={onClose}>
      {lowConfidence ? (
        <Text style={styles.lowNote}>
          Mirra wasn&apos;t sure about this one. Tell it what&apos;s on the plate and re-check.
        </Text>
      ) : null}

      <CapsLabel style={styles.label}>What is it?</CapsLabel>
      <TextInput
        accessibilityLabel="Meal name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        placeholderTextColor={color.onSurfaceVariant}
      />

      <CapsLabel style={styles.label}>Calories (kcal)</CapsLabel>
      <TextInput
        accessibilityLabel="Calories"
        value={kcal}
        onChangeText={(t) => setKcal(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        style={styles.input}
      />

      <CapsLabel style={styles.label}>Meal</CapsLabel>
      <View style={styles.slots}>
        {SLOTS.map((s) => (
          <Chip key={s} label={capitalize(s)} selected={slot === s} onPress={() => setSlot(s)} />
        ))}
      </View>

      <CapsLabel style={styles.label}>Tell Mirra more</CapsLabel>
      <TextInput
        accessibilityLabel="Note for re-estimate"
        value={note}
        onChangeText={setNote}
        placeholder="e.g. grilled salmon, no sauce, 2 eggs"
        placeholderTextColor={color.onSurfaceVariant}
        style={styles.input}
      />

      <View style={styles.actions}>
        <LimeCta
          label="Re-estimate"
          variant="dark"
          onPress={handleRefine}
          style={[styles.flex, note.trim() ? null : styles.disabled]}
        />
        <LimeCta label="Apply" onPress={handleApply} style={styles.flex} />
      </View>
    </SheetFrame>
  );
};

const styles = StyleSheet.create({
  lowNote: {
    marginTop: space.sm,
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 17,
    color: color.error,
  },
  label: { marginTop: space.md, marginBottom: 4 },
  input: {
    height: 46,
    borderRadius: radius.DEFAULT,
    backgroundColor: color.surfaceContainerHighest,
    paddingHorizontal: space.md,
    fontFamily: font.body,
    fontSize: 15,
    color: color.onSurface,
  },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  actions: { flexDirection: "row", gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
  disabled: { opacity: 0.45 },
});
