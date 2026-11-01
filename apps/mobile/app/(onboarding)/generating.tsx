import { router } from "expo-router";
import { Gauge, Dumbbell } from "lucide-react-native";
import { MotiView, type MotiTransition } from "moti";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { GeneratingBlueprintCard } from "@/features/onboarding/components/GeneratingBlueprintCard";
import { GeneratingHeader } from "@/features/onboarding/components/GeneratingHeader";
import { runOnboardingGenerate } from "@/features/onboarding/services/run-generate";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import type { CurrentPlan } from "@/lib/api";
import { usePlanStore } from "@/stores/plan-store";
import { color, font, radius } from "@/theme/tokens";

const MIN_MS = 2600;
/** Stitch calibration meter: starts at 74%, creeps toward 96%. */
const START_PERCENT = 74;
const MAX_PERCENT = 96;
const FINAL_STEP_AT = 85;
const TICK_MS = 400;
const TICK_STEP = 3;
const STATUS_ROTATE_MS = 1500;

const FADE: MotiTransition = {
  type: "timing",
  duration: 320,
} as MotiTransition;

const useCalibrationPercent = () => {
  const [percent, setPercent] = useState(START_PERCENT);
  useEffect(() => {
    const id = setInterval(() => {
      setPercent((p) => Math.min(MAX_PERCENT, p + TICK_STEP));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
  return percent;
};

const useRotatingStatus = (lines: readonly string[]) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (lines.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % lines.length);
    }, STATUS_ROTATE_MS);
    return () => clearInterval(id);
  }, [lines.length]);
  return lines[index] ?? lines[0] ?? "";
};

const toCurrentPlan = (plan: OnboardingWeekPlan): CurrentPlan => ({
  id: plan.id,
  version: plan.version,
  status: plan.status,
  weekStart: plan.weekStart,
  summary: plan.summary as CurrentPlan["summary"],
  days: plan.days.map((d) => ({
    id: d.id,
    dayIndex: d.dayIndex,
    date: d.date,
    kind: d.kind,
    label: d.label,
    workout: d.workout ?? null,
  })),
});

/** S11 — PUT onboarding → generate plan → week-reveal (Stitch + AI shimmer). */
const GeneratingScreen = () => {
  const c = onboardingCopy.generating;
  const setWeekPlan = useOnboardingStore((s) => s.setWeekPlan);
  const setPlan = usePlanStore((s) => s.setPlan);
  const started = useRef(false);
  const percent = useCalibrationPercent();
  const statusLine = useRotatingStatus(c.statusLines);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const startedAt = Date.now();
    const answers = useOnboardingStore.getState();

    void (async () => {
      try {
        const plan = await runOnboardingGenerate(answers);
        setWeekPlan(plan);
        setPlan(toCurrentPlan(plan));
      } catch {
        // runOnboardingGenerate already falls back locally; keep UX moving
      } finally {
        const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
        setTimeout(() => {
          router.replace("/(onboarding)/week-reveal");
        }, wait);
      }
    })();
  }, [setPlan, setWeekPlan]);

  return (
    <OnboardingShell scroll={false}>
      <View style={styles.root}>
        <GeneratingHeader />
        <View style={styles.center}>
          <GeneratingBlueprintCard
            percent={percent}
            finalStep={percent > FINAL_STEP_AT}
          />
          <View style={styles.status} accessibilityLiveRegion="polite">
            <MotiView
              key={statusLine}
              from={{ opacity: 0, translateY: 4 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={FADE}
            >
              <Text style={styles.statusTitle}>{statusLine}</Text>
            </MotiView>
            <Text style={styles.statusSub}>{c.sub}</Text>
          </View>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Gauge size={14} color={color.primaryFixed} />
              <Text style={styles.badgeText}>{c.badgeRecovery}</Text>
            </View>
            <View style={styles.badge}>
              <Dumbbell size={14} color={color.secondary} />
              <Text style={styles.badgeText}>{c.badgeEquipment}</Text>
            </View>
          </View>
        </View>
      </View>
    </OnboardingShell>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  status: {
    alignItems: "center",
    maxWidth: 320,
    gap: 4,
    minHeight: 48,
  },
  statusTitle: {
    fontFamily: font.headlineSemi,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
    color: color.primary,
    textAlign: "center",
  },
  statusSub: {
    fontFamily: font.body,
    fontSize: 12,
    lineHeight: 19.5,
    color: color.onSurfaceVariant,
    textAlign: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHigh,
  },
  badgeText: {
    fontFamily: font.labelBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    color: color.onSurface,
  },
});

export default GeneratingScreen;
