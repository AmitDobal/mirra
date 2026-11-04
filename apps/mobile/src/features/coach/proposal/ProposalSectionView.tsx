import { CalendarDays, Dumbbell, SlidersHorizontal, Utensils, type LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font } from "@/theme/tokens";

import { DiffRow } from "./DiffRow";
import { PrefDiffRow } from "./PrefDiffRow";
import type { ProposalArea, ProposalSection } from "./proposal-model";

const SECTION_ICON: Record<ProposalArea, LucideIcon> = {
  workout: Dumbbell,
  meal: Utensils,
  schedule: CalendarDays,
  prefs: SlidersHorizontal,
};

/** S39 section: lavender caps title (+ workout day), then one diff block per change. */
export const ProposalSectionView = ({ section }: { readonly section: ProposalSection }) => {
  const Icon = SECTION_ICON[section.area];
  return (
    <View style={styles.section}>
      <View>
        <View style={styles.head}>
          <Icon size={16} color={color.secondary} />
          <Text style={styles.title}>{section.title}</Text>
        </View>
        {section.subtitle ? <Text style={styles.subtitle}>{section.subtitle}</Text> : null}
      </View>
      {section.rows.map((row) =>
        row.variant === "single" ? (
          <PrefDiffRow key={row.key} text={row.text} tags={row.tags} />
        ) : (
          <DiffRow key={row.key} row={row} />
        ),
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { gap: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: {
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    color: color.secondary,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurfaceVariant,
  },
});
