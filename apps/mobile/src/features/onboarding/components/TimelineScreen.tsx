import { router } from "expo-router";
import { ChevronLeft, TrendingUp } from "lucide-react-native";
import { useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { onboardingCopy } from "@/content/onboarding";
import { color, font, radius, space, type } from "@/theme/tokens";
import { CapsLabel } from "@/ui";

import { sessionsPerWeek } from "../goal-preview";
import { syncCommitment } from "../services/commit-sync";
import { handleWeekRevealStart } from "../services/week-reveal-nav";
import { useOnboardingStore } from "../store";
import { buildTimelineView } from "../timeline-view";
import { useGoalPreview } from "../use-goal-preview";
import { OnboardingShell } from "./OnboardingShell";
import { HoldToCommit } from "./HoldToCommit";
import { TimelineChartCard, TimelineMilestones, TimelinePicked } from "./TimelineScreenCards";

const c = goalCopy.onboarding;

/** S43 — "Your timeline": projection, milestones, answers summary, hold-to-commit. */
export const TimelineScreen = () => {
  const { source, projection } = useGoalPreview();
  const sessionMinutes = useOnboardingStore((s) => s.sessionMinutes);
  const summary = useOnboardingStore((s) => s.weekPlan?.summary);
  const setCommitment = useOnboardingStore((s) => s.setCommitment);
  const leaving = useRef(false);

  const view = useMemo(() => {
    const goalLabel = onboardingCopy.goal.options.find((o) => o.id === source.goal)?.label ?? "";
    const experienceLabel = onboardingCopy.experience.options.find((o) => o.id === source.experience)?.label ?? "";
    return buildTimelineView(projection, {
      unit: source.weightUnit,
      goalLabel,
      paceLabel: onboardingCopy.target[source.pace],
      experienceLabel,
      sessions: sessionsPerWeek(source.trainingDays),
      sessionMinutes,
      kcal: summary?.kcalTarget ?? null,
      proteinG: summary?.proteinG ?? null,
    });
  }, [projection, source, sessionMinutes, summary]);

  const finish = (committed: boolean) => {
    if (leaving.current) return;
    leaving.current = true;
    setTimeout(() => {
      leaving.current = false;
    }, 1000);
    setCommitment(committed ? { committedAt: Date.now() } : null);
    void syncCommitment();
    handleWeekRevealStart();
  };

  const header = (
    <View style={styles.top}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.backLabel}
        onPress={() => router.back()}
        style={styles.back}
      >
        <ChevronLeft size={20} color={color.onSurface} />
      </Pressable>
      <View pointerEvents="none" style={styles.topTitle}>
        <CapsLabel>{c.title}</CapsLabel>
      </View>
    </View>
  );

  return (
    <OnboardingShell header={header}>
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowDot} />
        <CapsLabel tone="lime">{c.eyebrow}</CapsLabel>
      </View>
      <Text accessibilityRole="header" style={styles.headline}>
        {view.headline}
      </Text>
      <Text style={styles.sub}>{view.sub}</Text>

      <TimelineChartCard view={view} />
      {view.milestones.length ? <TimelineMilestones rows={view.milestones} /> : null}
      <TimelinePicked rows={view.picked} onEdit={() => router.replace("/(onboarding)/goal")} />

      {view.whatIf ? (
        <View style={styles.whatIf}>
          <TrendingUp size={18} color={color.primaryContainer} />
          <Text style={styles.whatIfText}>{view.whatIf}</Text>
        </View>
      ) : null}

      <Text style={styles.commitLine}>{view.commitLine}</Text>
      <HoldToCommit
        label={c.hold}
        accessibilityLabel={c.holdA11y}
        accessibilityHint={c.holdA11yHint}
        onCommit={() => finish(true)}
      />
      <Pressable accessibilityRole="button" onPress={() => finish(false)} style={styles.notNow}>
        <Text style={styles.notNowText}>{c.notNow}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>{c.disclaimer}</Text>
    </OnboardingShell>
  );
};

const bodyMd = { fontFamily: font.body, fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line } as const;

const styles = StyleSheet.create({
  top: { height: 56, flexDirection: "row", alignItems: "center" },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  topTitle: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  eyebrowRow: { marginTop: space.md, flexDirection: "row", alignItems: "center", gap: space.sm },
  eyebrowDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: color.primaryFixed },
  headline: {
    marginTop: space.sm,
    fontFamily: font.headline,
    fontSize: type.headlineLg.size,
    lineHeight: type.headlineLg.line,
    color: color.onSurface,
  },
  sub: { ...bodyMd, marginTop: 10, color: color.onSurfaceVariant },
  whatIf: {
    marginTop: space.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  whatIfText: { ...bodyMd, flexShrink: 1, textAlign: "center", color: color.onSurfaceVariant },
  commitLine: { ...bodyMd, marginTop: space.xl, marginBottom: space.md, textAlign: "center", color: color.onSurface },
  notNow: { marginTop: space.sm, height: space.touch, alignSelf: "center", justifyContent: "center", paddingHorizontal: space.md },
  notNowText: { fontFamily: font.label, fontSize: 15, lineHeight: 20, color: color.onSurfaceVariant },
  disclaimer: {
    marginTop: 12,
    textAlign: "center",
    fontFamily: font.body,
    fontSize: type.labelCaps.size,
    lineHeight: 15,
    color: color.onSurfaceVariant,
  },
});
