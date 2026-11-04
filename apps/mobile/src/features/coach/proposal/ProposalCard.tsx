import { SlidersHorizontal } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { planChatCopy } from "@/content/plan-chat";
import { color, font } from "@/theme/tokens";

import type { PlanProposal } from "../plan-chat-store";
import { ProposalActions } from "./ProposalActions";
import { ProposalSectionView } from "./ProposalSectionView";
import { buildProposalSections } from "./proposal-model";
import { hairline } from "./proposal-styles";

type Props = {
  readonly proposal: PlanProposal;
  readonly applying: boolean;
  readonly onApply: () => void;
  readonly onChange: () => void;
};

/** Stitch S39 — plan chat proposal v2: grouped struck-before → highlighted-after diff blocks. */
export const ProposalCard = ({ proposal, applying, onApply, onChange }: Props) => {
  const { status } = proposal;
  const sections = useMemo(
    () => buildProposalSections({ items: proposal.items, changes: proposal.changes }, planChatCopy),
    [proposal.items, proposal.changes],
  );
  const pending = status === "pending";
  const muted = status === "dismissed" || status === "stale";

  return (
    <View style={[styles.card, muted && styles.muted]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <SlidersHorizontal size={18} color={color.onSurface} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{planChatCopy.card.title}</Text>
          <Text style={styles.caption}>{planChatCopy.card.caption[status]}</Text>
        </View>
      </View>

      {sections.map((section) => (
        <ProposalSectionView key={section.area} section={section} />
      ))}

      {pending ? (
        <>
          <View style={styles.rule} />
          <ProposalActions applying={applying} onApply={onApply} onChange={onChange} />
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    gap: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: color.surfaceContainerLow,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: color.primaryFixed,
    borderLeftColor: color.primaryFixed,
    borderRightColor: hairline,
    borderBottomColor: hairline,
  },
  muted: { opacity: 0.6, borderTopColor: hairline, borderLeftColor: hairline },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: hairline,
  },
  headerText: { flexShrink: 1 },
  title: { fontFamily: font.label, fontSize: 18, lineHeight: 22, color: color.onSurface },
  caption: {
    marginTop: 2,
    fontFamily: font.label,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    color: color.onSurfaceVariant,
  },
  rule: { height: 1, backgroundColor: hairline },
});
