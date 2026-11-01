import { Search, Sparkles, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PlanExercise } from "@/lib/api";
import { color, space } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import {
  entryForPlanExercise,
  filterCatalog,
  suggestAlternatives,
  type CatalogEntry,
  type CatalogEquipment,
} from "./catalog";
import { AltCard } from "./AltCard";
import { styles } from "./SwapAddSheet.styles";

export type SheetMode =
  | { readonly kind: "add" }
  | { readonly kind: "swap"; readonly exercise: PlanExercise };

type Props = {
  readonly mode: SheetMode | null;
  readonly session: readonly PlanExercise[];
  readonly available: ReadonlySet<CatalogEquipment>;
  readonly onClose: () => void;
  readonly onSelect: (entry: CatalogEntry) => void;
};

/** S27 swap / add bottom sheet — equipment-aware alternatives + library search. */
export const SwapAddSheet = ({ mode, session, available, onClose, onSelect }: Props) => (
  <Modal visible={mode !== null} transparent animationType="slide" onRequestClose={onClose}>
    {mode ? (
      <SheetBody
        key={mode.kind === "swap" ? mode.exercise.id : "add"}
        mode={mode}
        session={session}
        available={available}
        onClose={onClose}
        onSelect={onSelect}
      />
    ) : null}
  </Modal>
);

const SheetBody = ({ mode, session, available, onClose, onSelect }: Props & { mode: SheetMode }) => {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const isSwap = mode.kind === "swap";
  const target = isSwap ? entryForPlanExercise(mode.exercise) : null;
  const names = useMemo(() => session.map((e) => e.name), [session]);

  const results = useMemo(() => {
    if (target) {
      return suggestAlternatives({
        target,
        available,
        exclude: names,
        query,
        limit: query.trim() ? 8 : 3,
      });
    }
    const taken = new Set(names.map((n) => n.toLowerCase()));
    return filterCatalog({ query }).filter((e) => !taken.has(e.name.toLowerCase()));
  }, [target, available, names, query]);

  return (
    <View style={styles.backdrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.flex1}>
            <View style={styles.eyebrow}>
              <View style={styles.dot} />
              <CapsLabel tone="lime">{isSwap ? "Movement replacement" : "Add to today"}</CapsLabel>
            </View>
            <Text style={styles.title}>{isSwap ? "Swap exercise" : "Add exercise"}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <X size={18} color={color.onSurface} />
          </Pressable>
        </View>

        {isSwap ? (
          <View style={styles.replacing}>
            <Text style={styles.replLabel}>Replacing:</Text>
            <Text style={styles.replName} numberOfLines={1}>
              {mode.exercise.name}
            </Text>
            <View style={styles.replSets}>
              <Text style={styles.replSetsText}>
                {mode.exercise.targetSets} × {mode.exercise.targetReps}
              </Text>
            </View>
            <Text style={styles.replMuscle} numberOfLines={1}>
              {target?.muscle}
            </Text>
          </View>
        ) : null}

        <View style={styles.search}>
          <Search size={18} color={color.onSurfaceVariant} />
          <TextInput
            accessibilityLabel="Search exercises"
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, muscle or equipment"
            placeholderTextColor={color.onSurfaceVariant}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")}>
              <X size={16} color={color.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHead}>
            <Sparkles size={13} color={color.primaryFixed} />
            <CapsLabel>{isSwap ? "Mirra alternatives" : "Exercise library"}</CapsLabel>
            {isSwap && !query.trim() ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Preserves volume</Text>
              </View>
            ) : null}
          </View>
          {results.length === 0 ? (
            <Text style={styles.empty}>No matches. Try a muscle or equipment name.</Text>
          ) : null}
          {results.map((entry, i) => (
            <AltCard
              key={entry.id}
              entry={entry}
              best={isSwap && i === 0 && !query.trim()}
              sets={isSwap ? mode.exercise.targetSets : entry.sets}
              owned={available.has(entry.equipment)}
              intent={isSwap ? "swap" : "add"}
              onSelect={() => onSelect(entry)}
            />
          ))}
        </ScrollView>

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
};
