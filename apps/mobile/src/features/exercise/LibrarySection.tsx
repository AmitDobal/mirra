import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { color, font, radius, space } from "@/theme/tokens";

import {
  EQUIPMENT_FILTERS,
  EXERCISE_CATALOG,
  PATTERN_LABEL,
  filterCatalog,
  thumbSource,
  type CatalogEntry,
  type CatalogEquipment,
  type CatalogPattern,
} from "./catalog";
import { FilterPill } from "./ExercisePills";

type Props = {
  readonly onOpen: (entry: CatalogEntry) => void;
};

const PATTERNS = Object.keys(PATTERN_LABEL) as CatalogPattern[];

/** S25 Exercise Library: movement chips, equipment chips, two-column photo grid. */
export const LibrarySection = ({ onOpen }: Props) => {
  const [pattern, setPattern] = useState<CatalogPattern | null>(null);
  const [equipment, setEquipment] = useState<CatalogEquipment | null>(null);
  const entries = useMemo(() => filterCatalog({ pattern, equipment }), [pattern, equipment]);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>Exercise Library</Text>
        <Text style={styles.count}>{EXERCISE_CATALOG.length} movements</Text>
      </View>
      <Text style={styles.sub}>Explore by movement pattern and equipment</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterPill label="All" selected={pattern === null} onPress={() => setPattern(null)} />
        {PATTERNS.map((p) => (
          <FilterPill
            key={p}
            label={PATTERN_LABEL[p]}
            selected={pattern === p}
            onPress={() => setPattern(pattern === p ? null : p)}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {EQUIPMENT_FILTERS.map((eq) => (
          <FilterPill
            key={eq}
            shape="square"
            label={eq}
            selected={equipment === eq}
            onPress={() => setEquipment(equipment === eq ? null : eq)}
          />
        ))}
      </ScrollView>

      {entries.length === 0 ? (
        <Text style={styles.empty}>No lifts match those filters.</Text>
      ) : (
        <View style={styles.grid}>
          {entries.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${e.name}`}
              onPress={() => onOpen(e)}
              style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
            >
              <View style={styles.photo}>
                <Image source={thumbSource(e.thumb)} style={styles.img} resizeMode="cover" />
                <View style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {e.muscle === PATTERN_LABEL[e.pattern]
                      ? e.muscle
                      : `${e.muscle} · ${PATTERN_LABEL[e.pattern]}`}
                  </Text>
                </View>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {e.name}
                </Text>
                <View style={styles.infoRow}>
                  <Text style={styles.eq} numberOfLines={1}>
                    {e.equipment}
                  </Text>
                  <Text style={styles.kind} numberOfLines={1}>
                    {e.kind}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  head: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  title: { fontFamily: font.headlineSemi, fontSize: 16, color: color.onSurface },
  count: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant },
  sub: { fontFamily: font.body, fontSize: 12, color: color.onSurfaceVariant, marginBottom: 2 },
  chips: { gap: 8, paddingRight: space.margin },
  empty: { fontFamily: font.body, fontSize: 14, color: color.onSurfaceVariant, paddingVertical: space.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48.4%",
    overflow: "hidden",
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
  },
  pressed: { opacity: 0.85 },
  photo: { height: 84 },
  img: { width: "100%", height: "100%", backgroundColor: color.surfaceContainerHigh },
  tag: {
    position: "absolute",
    top: 6,
    left: 6,
    maxWidth: "90%",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(19,19,19,0.8)",
  },
  tagText: { fontFamily: font.labelBold, fontSize: 9, color: color.primaryFixed },
  info: { padding: 10, gap: 4 },
  name: { fontFamily: font.headlineSemi, fontSize: 12, color: color.onSurface },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  eq: { flexShrink: 1, fontFamily: font.body, fontSize: 10, color: color.onSurfaceVariant },
  kind: { flexShrink: 0, fontFamily: font.label, fontSize: 10, color: color.secondary },
});
