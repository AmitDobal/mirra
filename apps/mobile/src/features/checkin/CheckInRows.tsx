import type { LucideIcon } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { color, font, radius, type } from "@/theme/tokens";

import {
  AREA_LABEL,
  BODY_AREAS,
  ENERGY_LEVELS,
  type BodyArea,
  type Energy,
} from "./checkin-logic";
import { PressScale } from "./PressScale";

type HeaderProps = {
  readonly Icon: LucideIcon;
  readonly iconColor: string;
  readonly label: string;
  readonly caption: string;
  readonly captionColor: string;
};

/** Row title (icon + caps label) with a short live caption on the right. */
export const RowHeader = ({ Icon, iconColor, label, caption, captionColor }: HeaderProps) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Icon size={16} color={iconColor} />
      <Text style={styles.headerLabel}>{label}</Text>
    </View>
    <Text style={[styles.caption, { color: captionColor }]} numberOfLines={1}>
      {caption}
    </Text>
  </View>
);

type EnergyProps = {
  readonly value: Energy;
  readonly onChange: (energy: Energy) => void;
};

/** Five large 1–5 tiles; the active one is electric lime. */
export const EnergyTiles = ({ value, onChange }: EnergyProps) => (
  <View style={styles.energyRow} accessibilityRole="radiogroup" accessibilityLabel="Energy 1 to 5">
    {ENERGY_LEVELS.map((level) => {
      const selected = level === value;
      return (
        <PressScale
          key={level}
          accessibilityRole="radio"
          accessibilityLabel={`Energy ${level}`}
          accessibilityState={{ selected }}
          onPress={() => onChange(level)}
          style={[styles.energyTile, selected && styles.energyTileActive]}
        >
          <Text style={[styles.energyText, selected && styles.energyTextActive]}>{level}</Text>
        </PressScale>
      );
    })}
  </View>
);

type SegmentedProps<T extends string> = {
  readonly label: string;
  readonly options: readonly { readonly id: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (id: T) => void;
  /** Selected-segment fill: lavender (sleep) or raised neutral (soreness). */
  readonly tone: "lavender" | "neutral";
};

/** Three-way segmented control (Sleep Poor/OK/Great, Soreness None/Some/Very). */
export const Segmented = <T extends string>({
  label,
  options,
  value,
  onChange,
  tone,
}: SegmentedProps<T>) => (
  <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={label}>
    {options.map((opt) => {
      const selected = opt.id === value;
      return (
        <PressScale
          key={opt.id}
          accessibilityRole="radio"
          accessibilityLabel={`${label} ${opt.label}`}
          accessibilityState={{ selected }}
          onPress={() => onChange(opt.id)}
          style={[
            styles.segment,
            selected && (tone === "lavender" ? styles.segmentLavender : styles.segmentNeutral),
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              selected && (tone === "lavender" ? styles.segmentTextLavender : styles.segmentTextNeutral),
            ]}
          >
            {opt.label}
          </Text>
        </PressScale>
      );
    })}
  </View>
);

type AreaProps = {
  readonly selected: readonly BodyArea[];
  readonly onToggle: (area: BodyArea) => void;
};

/** Optional body-area chips shown once soreness is Some / Very. */
export const AreaChips = ({ selected, onToggle }: AreaProps) => (
  <View style={styles.chips}>
    {BODY_AREAS.map((area) => {
      const on = selected.includes(area);
      return (
        <PressScale
          key={area}
          accessibilityRole="button"
          accessibilityLabel={`${AREA_LABEL[area]} sore`}
          accessibilityState={{ selected: on }}
          onPress={() => onToggle(area)}
          style={[styles.chip, on && styles.chipOn]}
        >
          {on ? <View style={styles.chipDot} /> : null}
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{AREA_LABEL[area]}</Text>
        </PressScale>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLabel: {
    fontFamily: font.labelBold,
    fontSize: type.labelCaps.size,
    lineHeight: type.labelCaps.line,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: color.onSurface,
  },
  caption: {
    fontFamily: font.label,
    fontSize: type.labelMd.size,
    lineHeight: type.labelMd.line,
    flexShrink: 1,
    marginLeft: 8,
  },
  energyRow: { flexDirection: "row", gap: 8 },
  energyTile: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.DEFAULT,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  energyTileActive: {
    backgroundColor: color.primaryContainer,
    borderColor: color.primaryContainer,
    borderWidth: 2,
    shadowColor: color.primaryContainer,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  energyText: { fontFamily: font.display, fontSize: type.headlineSm.size, color: color.onSurface },
  energyTextActive: { color: color.onPrimaryFixed },
  segmented: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: radius.DEFAULT,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  segment: { flex: 1, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  segmentLavender: { backgroundColor: color.secondary },
  segmentNeutral: {
    backgroundColor: color.surfaceBright,
    borderWidth: 1,
    borderColor: color.outlineVariant,
  },
  segmentText: {
    fontFamily: font.label,
    fontSize: type.labelLg.size,
    color: color.onSurfaceVariant,
  },
  segmentTextLavender: { fontFamily: font.labelBold, color: color.onSecondaryFixed },
  segmentTextNeutral: { fontFamily: font.labelBold, color: color.onSurface },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainer,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
  chipOn: { borderWidth: 2, borderColor: color.primaryContainer, paddingHorizontal: 13, paddingVertical: 7 },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryContainer },
  chipText: { fontFamily: font.body, fontSize: type.bodySm.size, color: color.onSurfaceVariant },
  chipTextOn: { fontFamily: font.bodySemi, color: color.onSurface },
});
