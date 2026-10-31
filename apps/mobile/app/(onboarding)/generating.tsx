import { router } from "expo-router";
import { MotiView, type MotiTransition } from "moti";
import { useEffect, useRef, useState } from "react";
import { Image, Text, View } from "react-native";

import { s11GeneratingWeek } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import {
  runOnboardingGenerate,
  type GeneratePhase,
} from "@/features/onboarding/services/run-generate";
import type { OnboardingWeekPlan } from "@/features/onboarding/types";
import type { CurrentPlan } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";
import { usePlanStore } from "@/stores/plan-store";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const MIN_MS = 2200;
const DAY_CAPSULES = [
  { letter: "M", tag: "LEG", tone: "lime" as const },
  { letter: "T", tag: "REC", tone: "lav" as const },
  { letter: "W", tag: "PUSH", tone: "lime" as const },
  { letter: "T", tag: "PULL", tone: "active" as const },
  { letter: "F", tag: "HYB", tone: "dim" as const },
  { letter: "S", tag: "AER", tone: "dim" as const },
  { letter: "S", tag: "OFF", tone: "dim" as const },
];

type GenerateStatus = GeneratePhase | "failed";

const statusText = (
  status: GenerateStatus,
  c: typeof onboardingCopy.generating,
) => {
  if (status === "connecting") return c.connecting;
  if (status === "building") return c.building;
  if (status === "offline") return c.offline;
  return c.failed;
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

/** S11 Generating week — Stitch calibration engine layout + real generate. */
const GeneratingScreen = () => {
  const c = onboardingCopy.generating;
  const setWeekPlan = useOnboardingStore((s) => s.setWeekPlan);
  const setPlanOptions = useOnboardingStore((s) => s.setPlanOptions);
  const setPlan = usePlanStore((s) => s.setPlan);
  const started = useRef(false);
  const [status, setStatus] = useState<GenerateStatus>("connecting");
  const [pct, setPct] = useState(18);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startedAt = Date.now();
    const answers = useOnboardingStore.getState();
    const tick = setInterval(() => {
      setPct((p) => Math.min(92, p + 7));
    }, 280);

    void (async () => {
      try {
        const plan = await runOnboardingGenerate(answers, (phase) =>
          setStatus(phase),
        );
        setPlanOptions(null);
        setWeekPlan(plan);
        setPlan(toCurrentPlan(plan));
        setStatus(plan.source === "local" ? "offline" : "building");
        setPct(100);
        logger.info("generating.outcome", {
          source: plan.source,
          generator: plan.summary?.generator,
          planId: plan.id,
        });
      } catch (err) {
        setStatus("failed");
        logger.error("generating.outcome", {
          source: "none",
          message: errorMessage(err),
        });
      } finally {
        clearInterval(tick);
        const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
        setTimeout(() => {
          router.replace("/(onboarding)/week-reveal");
        }, wait);
      }
    })();
  }, [setPlan, setPlanOptions, setWeekPlan]);

  const cards = [
    {
      src: s11GeneratingWeek.athleteSquat,
      title: "Strength block",
      tone: "lime" as const,
    },
    {
      src: s11GeneratingWeek.sprinterKneeling,
      title: "Recovery cadence",
      tone: "lav" as const,
    },
    {
      src: s11GeneratingWeek.athleteBarbell,
      title: "Hypertrophy track",
      tone: "neutral" as const,
    },
  ];

  return (
    <OnboardingShell scroll={false}>
      <View style={sx("flex-1 justify-center gap-space-lg py-space-md")}>
        <View style={sx("flex-row items-center justify-between")}>
          <View style={sx("flex-row items-center gap-space-sm rounded-full bg-surface-container-high px-space-md py-1.5")}>
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ type: "timing", duration: 700, loop: true } as MotiTransition}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color.primaryFixed,
              }}
            />
            <Text style={sx("font-label text-label-caps text-primary-fixed")}>
              AI CALIBRATION ENGINE
            </Text>
          </View>
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>
            v2.4 SYNTH
          </Text>
        </View>

        <View style={sx("overflow-hidden rounded-lg bg-surface-container-low p-space-lg")}>
          <View style={sx("mb-space-md flex-row items-center justify-between")}>
            <View>
              <Text style={sx("font-label text-label-caps text-on-surface-variant")}>
                Weekly Blueprint
              </Text>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
                Microcycle Ingest
              </Text>
            </View>
            <View style={sx("rounded-full bg-surface-container-highest px-2.5 py-1")}>
              <Text style={sx("font-label text-label-md text-secondary")}>{pct}%</Text>
            </View>
          </View>

          <View style={sx("mb-space-md flex-row justify-between gap-1")}>
            {DAY_CAPSULES.map((d, i) => (
              <View
                key={`${d.letter}-${i}`}
                style={sx(
                  `flex-1 items-center rounded-DEFAULT px-0.5 py-2 ${
                    d.tone === "active"
                      ? "bg-surface-container-high"
                      : d.tone === "dim"
                        ? "bg-surface-container/50 opacity-50"
                        : "bg-surface-container"
                  }`,
                )}
              >
                <Text style={sx("mb-1 font-label text-label-caps text-on-surface-variant")}>
                  {d.letter}
                </Text>
                <View
                  style={sx(
                    `h-7 w-5 items-center justify-center rounded-full ${
                      d.tone === "active"
                        ? "bg-primary-fixed"
                        : d.tone === "lav"
                          ? "bg-secondary/25"
                          : d.tone === "lime"
                            ? "bg-primary-fixed/20"
                            : "bg-surface-container-highest"
                    }`,
                  )}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        d.tone === "active" || d.tone === "lime"
                          ? color.onPrimaryFixed
                          : d.tone === "lav"
                            ? color.secondary
                            : color.outlineVariant,
                    }}
                  />
                </View>
                <Text
                  style={sx(
                    `mt-1.5 font-label text-[9px] ${
                      d.tone === "dim" ? "text-outline-variant" : "text-primary-fixed"
                    }`,
                  )}
                >
                  {d.tag}
                </Text>
              </View>
            ))}
          </View>

          <View style={sx("gap-space-sm")}>
            {cards.map((card) => (
              <View
                key={card.title}
                style={sx(
                  `flex-row items-center gap-space-md overflow-hidden rounded-DEFAULT p-space-sm ${
                    card.tone === "lime"
                      ? "bg-primary-fixed/15"
                      : card.tone === "lav"
                        ? "bg-secondary/15"
                        : "bg-surface-container"
                  }`,
                )}
              >
                <Image
                  source={card.src}
                  accessibilityLabel={card.title}
                  style={{ width: 56, height: 72, borderRadius: 8 }}
                  resizeMode="cover"
                />
                <View style={sx("flex-1 gap-1")}>
                  <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
                    {card.title}
                  </Text>
                  <MotiView
                    from={{ opacity: 0.35 }}
                    animate={{ opacity: 0.95 }}
                    transition={
                      {
                        type: "timing",
                        duration: 900,
                        loop: true,
                      } as MotiTransition
                    }
                    style={{
                      height: 8,
                      width: "70%",
                      borderRadius: 999,
                      backgroundColor: color.surfaceContainerHighest,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={sx("text-center font-label text-label-caps text-on-surface-variant")}>
          {c.label}
        </Text>
        <Text
          accessibilityLiveRegion="polite"
          style={sx("text-center font-body text-body-sm text-on-surface-variant")}
        >
          {statusText(status, c)}
        </Text>
        <View style={sx("h-1 overflow-hidden rounded-full bg-surface-container-high")}>
          <MotiView
            animate={{ width: `${pct}%` }}
            transition={{ type: "timing", duration: 280 } as MotiTransition}
            style={{
              height: "100%",
              borderRadius: 999,
              backgroundColor: color.primaryFixed,
            }}
          />
        </View>
      </View>
    </OnboardingShell>
  );
};

export default GeneratingScreen;
