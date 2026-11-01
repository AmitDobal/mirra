import { AlertTriangle, Info } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color, font, radius, space } from "@/theme/tokens";

import type { Micros } from "./snap-model";

type NoteProps = {
  readonly tone: "info" | "alert";
  readonly title: string;
  readonly body: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
};

/** Wellness note / low-confidence banner (purple info, red alert). */
export const NoteCard = ({ tone, title, body, actionLabel, onAction }: NoteProps) => {
  const alert = tone === "alert";
  const Icon = alert ? AlertTriangle : Info;
  return (
    <View style={[styles.note, alert ? styles.noteAlert : styles.noteInfo]}>
      <View style={styles.noteIcon}>
        <Icon size={18} color={alert ? color.error : color.secondary} />
      </View>
      <View style={styles.noteBody}>
        <View style={styles.noteHead}>
          <Text style={styles.noteTitle}>{title}</Text>
          {actionLabel && onAction ? (
            <Pressable
              accessibilityRole="button"
              onPress={onAction}
              style={styles.action}
              hitSlop={6}
            >
              <CapsLabel>{actionLabel}</CapsLabel>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.noteText}>{body}</Text>
      </View>
    </View>
  );
};

const Chip = ({ label, value, flag }: { label: string; value: string; flag?: boolean }) => (
  <View style={styles.chip}>
    {flag ? <View style={styles.flag} /> : null}
    <Text style={styles.chipText}>
      {`${label} `}
      <Text style={[styles.chipValue, flag && styles.chipValueFlag]}>{value}</Text>
    </Text>
  </View>
);

/** Daily sodium ceiling used only to flag a chip, not as medical advice. */
const SODIUM_FLAG_MG = 700;

export const MicroChips = ({ micros }: { micros: Micros }) => {
  const items: { label: string; value: string; flag?: boolean }[] = [];
  if (micros.fiberG !== null) items.push({ label: "Fiber", value: `${micros.fiberG}g` });
  if (micros.sugarG !== null) items.push({ label: "Sugar", value: `${micros.sugarG}g` });
  if (micros.sodiumMg !== null) {
    items.push({
      label: "Sodium",
      value: `${micros.sodiumMg}mg`,
      flag: micros.sodiumMg >= SODIUM_FLAG_MG,
    });
  }
  if (items.length === 0) return null;
  return (
    <View style={styles.micros}>
      <CapsLabel style={styles.microLabel}>Key micronutrients</CapsLabel>
      <View style={styles.chips}>
        {items.map((i) => (
          <Chip key={i.label} {...i} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  note: {
    flexDirection: "row",
    gap: space.sm,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.md,
  },
  noteInfo: {
    backgroundColor: `${color.secondaryContainer}59`,
    borderColor: `${color.secondary}40`,
  },
  noteAlert: { backgroundColor: `${color.errorContainer}66`, borderColor: `${color.error}66` },
  noteIcon: { paddingTop: 1 },
  noteBody: { flex: 1 },
  noteHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  noteTitle: { flex: 1, fontFamily: font.headline, fontSize: 14, color: color.onSurface },
  action: {
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  noteText: {
    marginTop: 3,
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 17,
    color: color.onSurfaceVariant,
  },
  micros: { marginBottom: space.md },
  microLabel: { marginBottom: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  flag: { width: 6, height: 6, borderRadius: 3, backgroundColor: color.error },
  chipText: { fontFamily: font.body, fontSize: 12, color: color.onSurface },
  chipValue: { fontFamily: font.bodyBold, color: color.primaryFixed },
  chipValueFlag: { color: color.error },
});
