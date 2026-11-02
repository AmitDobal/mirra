import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Dumbbell,
  Minus,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius, space } from "@/theme/tokens";

import { buildProposalSections, type ProposalSection } from "./proposal-rows";
import type { PlanProposal } from "./plan-chat-store";

type Props = {
  readonly proposal: PlanProposal;
  readonly applying: boolean;
  readonly onApply: () => void;
  readonly onChange: () => void;
};

const SECTION_ICON: Record<ProposalSection["area"], LucideIcon> = {
  workout: Dumbbell,
  meal: Utensils,
  prefs: Sparkles,
};

const STATUS_COPY = {
  pending: { caption: "READY FOR COMMIT", chip: "Review" },
  applied: { caption: "APPLIED TO YOUR PLAN", chip: "Applied" },
  dismissed: { caption: "NOT APPLIED", chip: "Dismissed" },
} as const;

/** Hex token + 0-255 alpha → rgba-capable hex8 (keeps colors on theme tokens). */
const alpha = (hex: string, a: number): string =>
  `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;

/** Stitch S28 — Plan chat proposal: before → after rows, Yes, apply / Want to change. */
export const ProposalCard = ({ proposal, applying, onApply, onChange }: Props) => {
  const sections = buildProposalSections(proposal.changes);
  const { status } = proposal;
  const pending = status === "pending";
  const copy = STATUS_COPY[status];

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, status === "dismissed" && styles.cardMuted]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <SlidersHorizontal size={18} color={color.primaryFixed} />
            </View>
            <View>
              <Text style={styles.title}>Proposed changes</Text>
              <Text style={styles.caption}>{copy.caption}</Text>
            </View>
          </View>
          <View style={[styles.chip, !pending && styles.chipQuiet]}>
            <Text style={[styles.chipText, !pending && styles.chipTextQuiet]}>{copy.chip}</Text>
          </View>
        </View>

        {sections.map((section) => {
          const Icon = SECTION_ICON[section.area];
          return (
            <View key={section.area} style={styles.section}>
              <View style={styles.sectionHead}>
                <Icon size={16} color={color.secondary} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.rowsBox}>
                {section.rows.map((row, i) => (
                  <View key={row.key}>
                    {i > 0 ? <View style={styles.rowGap} /> : null}
                    {row.before != null ? (
                      <>
                        <View style={styles.beforeRow}>
                          <Minus size={14} color={alpha(color.onSurfaceVariant, 0.7)} />
                          <Text style={styles.beforeText}>Before: {row.before}</Text>
                        </View>
                        <View style={styles.swapRow}>
                          <ArrowLeftRight size={16} color={color.primaryFixed} />
                          <View style={styles.swapLine} />
                        </View>
                      </>
                    ) : null}
                    <View style={styles.afterRow}>
                      <CheckCircle2 size={16} color={color.primaryFixed} />
                      <Text style={styles.afterText}>
                        {row.before != null ? "After: " : ""}
                        {row.after}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {pending ? (
          <>
            <View style={styles.promptWrap}>
              <Text style={styles.prompt}>Are you sure you want to apply these to your plan?</Text>
            </View>
            <View style={styles.buttons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Want to change"
                disabled={applying}
                onPress={onChange}
                style={({ pressed }) => [
                  styles.btn,
                  styles.btnGhost,
                  (pressed || applying) && styles.btnDim,
                ]}
              >
                <Pencil size={16} color={color.secondary} />
                <Text style={styles.btnGhostText}>Want to change</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Yes, apply"
                accessibilityState={{ busy: applying }}
                disabled={applying}
                onPress={onApply}
                style={({ pressed }) => [styles.btn, styles.btnLime, pressed && styles.btnDim]}
              >
                {applying ? (
                  <ActivityIndicator size="small" color={color.onPrimaryFixed} />
                ) : (
                  <Check size={16} color={color.onPrimaryFixed} />
                )}
                <Text style={styles.btnLimeText}>{applying ? "Applying…" : "Yes, apply"}</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      {pending ? (
        <View style={styles.awaiting}>
          <ActivityIndicator size="small" color={color.primaryFixed} />
          <Text style={styles.awaitingText}>Awaiting your confirmation to update your plan…</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { width: "100%", gap: space.sm },
  card: {
    backgroundColor: color.surfaceContainerLow,
    borderRadius: radius.DEFAULT,
    borderWidth: 1,
    borderColor: alpha(color.outlineVariant, 0.3),
    borderLeftWidth: 4,
    borderLeftColor: color.primaryFixed,
    padding: space.lg,
    overflow: "hidden",
  },
  cardMuted: { opacity: 0.6, borderLeftColor: color.outlineVariant },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: alpha(color.surfaceContainerHigh, 0.8),
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(color.primaryFixed, 0.2),
  },
  title: { fontFamily: font.headlineSemi, fontSize: 18, lineHeight: 20, color: color.onSurface },
  caption: {
    marginTop: 2,
    fontFamily: font.labelBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: color.onSurfaceVariant,
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: alpha(color.primaryFixed, 0.6),
    backgroundColor: color.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipQuiet: { borderColor: color.outlineVariant },
  chipText: {
    fontFamily: font.labelBold,
    fontSize: 11,
    letterSpacing: 0.9,
    color: color.primaryFixed,
  },
  chipTextQuiet: { color: color.onSurfaceVariant },
  section: { marginTop: space.md, gap: space.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: {
    fontFamily: font.labelBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: color.secondary,
  },
  rowsBox: {
    backgroundColor: alpha(color.surfaceContainerLowest, 0.8),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: alpha(color.surfaceContainerHigh, 0.6),
    padding: 12,
  },
  rowGap: {
    height: 1,
    backgroundColor: alpha(color.outlineVariant, 0.3),
    marginVertical: 12,
  },
  beforeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  beforeText: {
    flexShrink: 1,
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 16,
    textDecorationLine: "line-through",
    color: alpha(color.onSurfaceVariant, 0.7),
  },
  swapRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8, marginVertical: 10 },
  swapLine: { flex: 1, height: 1, backgroundColor: alpha(color.outlineVariant, 0.3) },
  afterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  afterText: {
    flexShrink: 1,
    fontFamily: font.labelBold,
    fontSize: 14,
    lineHeight: 18,
    color: color.primaryFixed,
  },
  promptWrap: {
    marginTop: space.md,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: alpha(color.surfaceContainerHigh, 0.8),
    alignItems: "center",
  },
  prompt: {
    fontFamily: font.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    color: color.onSurface,
  },
  buttons: { flexDirection: "row", gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  btnGhost: { borderWidth: 1, borderColor: color.secondary },
  btnLime: { backgroundColor: color.primaryFixed },
  btnDim: { opacity: 0.6 },
  btnGhostText: { fontFamily: font.label, fontSize: 12, letterSpacing: 0.5, color: color.secondary },
  btnLimeText: {
    fontFamily: font.labelBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: color.onPrimaryFixed,
  },
  awaiting: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 4,
  },
  awaitingText: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
    color: alpha(color.onSurfaceVariant, 0.7),
  },
});
