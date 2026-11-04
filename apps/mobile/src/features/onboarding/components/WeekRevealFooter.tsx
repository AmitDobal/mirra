import { router } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { onboardingCopy } from "@/content/onboarding";
import { color, font, space, type } from "@/theme/tokens";
import { Button } from "@/ui";

import { AFTER_WEEK_REVEAL } from "../funnel-steps";

type PaceLineProps = {
  /** Engine line parts (goal weight set); else the plan's `outcomeLine`. */
  readonly pace: { readonly amount: string; readonly date: string } | null;
  readonly outcome: string | null | undefined;
};

/** Stitch S12 trending line: "At this pace, **~7 kg** by around Mar 6". */
export const WeekRevealPaceLine = ({ pace, outcome }: PaceLineProps) => {
  const w = goalCopy.weekReveal;
  if (!pace && !outcome) return null;
  return (
    <View style={styles.line}>
      <TrendingUp size={18} color={color.primaryContainer} />
      <Text numberOfLines={2} style={styles.text}>
        {pace ? (
          <>
            {w.lead}
            <Text style={styles.amount}>{w.amount(pace.amount)}</Text>
            {w.tail(pace.date)}
          </>
        ) : (
          outcome
        )}
      </Text>
    </View>
  );
};

/** S12 sticky CTAs: Start → S43 timeline; Edit answers → quiz start. */
export const WeekRevealFooter = () => {
  const c = onboardingCopy.weekReveal;
  return (
    <>
      <Button label={c.start} onPress={() => router.push(AFTER_WEEK_REVEAL)} />
      <Button label={c.edit} variant="ghost" onPress={() => router.replace("/(onboarding)/goal")} />
    </>
  );
};

const styles = StyleSheet.create({
  line: {
    marginTop: space.lg,
    marginBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  text: {
    flexShrink: 1,
    textAlign: "center",
    fontFamily: font.bodyMedium,
    fontSize: type.bodyMd.size,
    lineHeight: type.bodyMd.line,
    color: color.onSurfaceVariant,
  },
  amount: { fontFamily: font.bodyBold, color: color.primary },
});
