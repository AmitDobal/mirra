import { ArrowLeftRight, CheckCircle2, Minus } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { planChatCopy } from "@/content/plan-chat";
import { color, font } from "@/theme/tokens";

import { DiffTag } from "./DiffTag";
import type { DiffRowModel } from "./proposal-model";
import { blockStyle, hairline } from "./proposal-styles";

type ChangeRow = Exclude<DiffRowModel, { variant: "single" }>;

/** Struck old state (S39 line 1): minus icon, on-surface-variant, optional kcal pill. */
const BeforeLine = ({ text, pill }: { readonly text: string; readonly pill: string | null }) => (
  <View style={styles.line}>
    <View style={styles.lineMain}>
      <Minus size={16} color={color.onSurfaceVariant} />
      <Text style={styles.beforeText}>{text}</Text>
    </View>
    {pill ? <DiffTag label={pill} tone="kcal" /> : null}
  </View>
);

/** Hairline with the lime swap arrows between before and after. */
const SwapDivider = () => (
  <View style={styles.divider}>
    <View style={styles.dividerLine} />
    <ArrowLeftRight size={15} color={color.primaryFixed} />
    <View style={styles.dividerLine} />
  </View>
);

/** Highlighted new state (S39 line 2): lime check + lime text, tag pills right. */
const AfterLine = ({ text, tags }: { readonly text: string; readonly tags: readonly string[] }) => (
  <View style={styles.line}>
    <View style={styles.lineMain}>
      <CheckCircle2 size={18} color={color.primaryFixed} />
      <Text style={styles.afterText}>{text}</Text>
    </View>
    {tags.length > 0 ? (
      <View style={styles.tags}>
        {tags.map((t) => (
          <DiffTag key={t} label={t} />
        ))}
      </View>
    ) : null}
  </View>
);

const ReasonLine = ({ text }: { readonly text: string }) => (
  <Text style={styles.reason}>
    {planChatCopy.row.reason}
    {text}
  </Text>
);

/**
 * One S39 diff block for meals, exercises, session length, meals per day and schedule
 * moves: struck "Before" → highlighted "After" (swap), "Add" only, or struck "Remove" only.
 */
export const DiffRow = ({ row }: { readonly row: ChangeRow }) => (
  <View style={styles.block}>
    {row.variant !== "add" ? <BeforeLine text={row.before} pill={row.beforePill} /> : null}
    {row.variant === "swap" ? <SwapDivider /> : null}
    {row.variant !== "remove" ? <AfterLine text={row.after} tags={row.tags} /> : null}
    {row.reason ? <ReasonLine text={row.reason} /> : null}
  </View>
);

const styles = StyleSheet.create({
  block: { ...blockStyle, gap: 10 },
  line: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  lineMain: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  beforeText: {
    flexShrink: 1,
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.onSurfaceVariant,
    textDecorationLine: "line-through",
  },
  afterText: {
    flexShrink: 1,
    fontFamily: font.label,
    fontSize: 13,
    lineHeight: 18,
    color: color.primaryFixed,
  },
  tags: { flexShrink: 0, alignItems: "flex-end", gap: 4 },
  divider: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: hairline },
  reason: {
    paddingLeft: 24,
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 16,
    color: color.onSurface,
  },
});
