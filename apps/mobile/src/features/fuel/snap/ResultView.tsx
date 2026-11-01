import { ArrowRight, SlidersHorizontal } from "lucide-react-native";
import { MotiView } from "moti";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LimeCta } from "@/ui/LimeCta";
import { color, font, space } from "@/theme/tokens";

import { EnergyCard } from "./EnergyCard";
import { FixSheet, type FixValues } from "./FixSheet";
import { IngredientRows } from "./IngredientRows";
import { MicroChips, NoteCard } from "./InsightBlocks";
import { MacroTiles } from "./MacroTiles";
import { PhotoCard } from "./PhotoCard";
import { PortionSheet } from "./PortionSheet";
import { ResultHeader } from "./ResultHeader";
import { AddIngredientSheet } from "./AddIngredientSheet";
import {
  isLowConfidence,
  microsOf,
  totalsOf,
  withGrams,
  withIngredient,
  withKcal,
  type SnapDraft,
} from "./snap-model";

type Props = {
  readonly draft: SnapDraft;
  readonly onDraft: (next: SnapDraft) => void;
  readonly photoUri: string | null;
  readonly description: string;
  readonly targetKcal: number;
  readonly loggedKcal: number;
  readonly saving: boolean;
  readonly saveError: string | null;
  readonly onSave: () => void;
  readonly onClose: () => void;
  readonly onRetake: () => void;
  readonly onRefine: (note: string) => void;
};

/** S19b result: kcal, macros, ingredients, micros, warnings, Fix + Save. */
export const ResultView = ({
  draft,
  onDraft,
  photoUri,
  description,
  targetKcal,
  loggedKcal,
  saving,
  saveError,
  onSave,
  onClose,
  onRetake,
  onRefine,
}: Props) => {
  const insets = useSafeAreaInsets();
  const [portionFocus, setPortionFocus] = useState<string | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [warningsHidden, setWarningsHidden] = useState(false);

  const totals = useMemo(() => totalsOf(draft), [draft]);
  const micros = useMemo(() => microsOf(draft), [draft]);
  const low = isLowConfidence(draft);
  const rough = draft.source === "heuristic" && draft.warnings.length === 0;
  const fixInitial: FixValues = { name: draft.name, slot: draft.slot, kcal: totals.kcal };

  const handleFix = (v: FixValues) => {
    const renamed = { ...draft, name: v.name, slot: v.slot };
    onDraft(v.kcal !== totals.kcal ? withKcal(renamed, v.kcal) : renamed);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space.md,
          paddingHorizontal: space.margin,
          paddingBottom: 132 + insets.bottom,
        }}
      >
        <ResultHeader
          confidence={draft.confidence}
          low={low}
          retakeLabel={photoUri ? "Retake" : "Rewrite"}
          onClose={onClose}
          onRetake={onRetake}
        />
        <MotiView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }}>
          <PhotoCard photoUri={photoUri} name={draft.name} description={description} />
          <EnergyCard kcal={totals.kcal} targetKcal={targetKcal} loggedKcal={loggedKcal} />
        </MotiView>
        <MacroTiles totals={totals} />

        {low ? (
          <NoteCard
            tone="alert"
            title="Low confidence"
            body="Mirra isn't sure about this plate. Check the portions below or tap Fix results."
          />
        ) : null}
        {rough ? (
          <NoteCard
            tone="info"
            title="Rough estimate"
            body="Vision is offline right now, so these numbers come from a basic guess. Adjust before saving."
          />
        ) : null}
        {!warningsHidden
          ? draft.warnings
              .slice(0, 2)
              .map((w) => (
                <NoteCard
                  key={w}
                  tone="info"
                  title="Heads up"
                  body={w}
                  actionLabel="Got it"
                  onAction={() => setWarningsHidden(true)}
                />
              ))
          : null}

        <IngredientRows
          ingredients={draft.ingredients}
          onEdit={(id) => setPortionFocus(id)}
          onAdd={() => setAdding(true)}
        />
        <MicroChips micros={micros} />
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.md }]}>
        <LimeCta
          label="Fix results"
          variant={low ? "ghost" : "dark"}
          onPress={() => setFixing(true)}
          icon={<SlidersHorizontal size={16} color={color.onSurface} />}
          style={[styles.fix, low && styles.fixLow]}
        />
        <LimeCta
          label={saving ? "Saving…" : "Save meal"}
          onPress={onSave}
          icon={<ArrowRight size={18} color={color.onPrimaryFixed} />}
          style={styles.save}
        />
      </View>

      <PortionSheet
        visible={portionFocus !== undefined}
        ingredients={draft.ingredients}
        focusId={portionFocus ?? null}
        onClose={() => setPortionFocus(undefined)}
        onApply={(grams) => onDraft(withGrams(draft, grams))}
      />
      <AddIngredientSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(i) => onDraft(withIngredient(draft, i))}
      />
      <FixSheet
        visible={fixing}
        initial={fixInitial}
        lowConfidence={low}
        onClose={() => setFixing(false)}
        onApply={handleFix}
        onRefine={onRefine}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.margin,
    paddingTop: space.md,
    backgroundColor: color.surface,
  },
  fix: { flex: 1 },
  fixLow: { borderColor: color.error },
  save: { flex: 1.5 },
  error: { fontFamily: font.body, fontSize: 12, color: color.error, marginBottom: space.sm },
});
