import { router } from "expo-router";
import { ArrowRight, X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { s21RebuildPreview } from "../../../assets/stitch";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { usePlanStore } from "@/stores/plan-store";

import { useCoachStore } from "./coach-store";

/** S21 Rebuild preview — Apply / Keep → today. */
export const RebuildScreen = () => {
  const apply = useCoachStore((s) => s.apply);
  const keep = useCoachStore((s) => s.keep);
  const notice = useCoachStore((s) => s.notice);
  const previewAfter = useCoachStore((s) => s.previewAfter);
  const plan = usePlanStore((s) => s.plan);
  const [busy, setBusy] = useState(false);

  const source = previewAfter ?? plan;
  const summary = source?.summary as
    | { kcalTarget?: number; proteinG?: number; outcomeLine?: string }
    | undefined;
  const days =
    source?.days.slice(0, 4).map((d, i) => ({
      day: d.date.slice(5) || "—",
      tag: i === 0 ? "Today" : d.kind,
      title: d.workout?.title ?? d.label ?? d.kind,
      meta: d.workout ? `${d.workout.durationMin} min` : "Rest",
    })) ?? [];

  const metrics = [
    {
      label: "Days",
      value: String(source?.days.length ?? 0),
      meta: "In plan",
    },
    {
      label: "Burn",
      value: summary?.kcalTarget != null ? String(summary.kcalTarget) : "—",
      meta: "kcal target",
    },
    {
      label: "Protein",
      value: summary?.proteinG != null ? `${summary.proteinG}g` : "—",
      meta: "Floor",
    },
  ];

  const goToday = () => router.replace("/(tabs)/today");

  const handleApply = async () => {
    if (busy) return;
    setBusy(true);
    await apply();
    setBusy(false);
    goToday();
  };

  const handleKeep = async () => {
    if (busy) return;
    setBusy(true);
    await keep();
    setBusy(false);
    goToday();
  };

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={() => void handleKeep()}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel tone="lime">AI Optimization</CapsLabel>
        <View className="w-11" />
      </View>

      <Text className="font-headline text-headline-lg text-on-surface">Rebuild Preview</Text>
      <Image
        source={s21RebuildPreview.athleteStretching}
        accessibilityLabel="Rebuild preview"
        style={{ width: "100%", height: 140, borderRadius: 12, marginTop: 12 }}
        resizeMode="cover"
      />
      <View className="mt-space-sm self-start rounded-full bg-primary-fixed px-3 py-1">
        <CapsLabel tone="dark">{notice ?? "Volume-preserving shift"}</CapsLabel>
      </View>
      <Text className="mt-space-md font-headline-sm text-headline-sm text-on-surface">
        {summary?.outcomeLine || "Your week, re-calibrated."}
      </Text>
      <Text className="mt-1 font-body text-body-md text-on-surface-variant">
        Plan {source ? `v${source.version}` : "unavailable"}
      </Text>

      <View className="my-space-md flex-row gap-space-sm">
        {metrics.map((met) => (
          <View key={met.label} className="flex-1 rounded-lg bg-surface-container-high p-space-md">
            <CapsLabel>{met.label}</CapsLabel>
            <Text className="mt-1 font-display text-headline-md text-on-surface">{met.value}</Text>
            <Text className="font-body text-body-sm text-primary-fixed">{met.meta}</Text>
          </View>
        ))}
      </View>

      <CapsLabel className="mb-space-sm">Schedule Comparison</CapsLabel>
      {days.length === 0 ? (
        <View className="mb-space-sm rounded-lg bg-surface-container-low p-space-md">
          <Text className="font-body text-body-md text-on-surface-variant">
            No plan days to preview yet.
          </Text>
        </View>
      ) : (
        days.map((d) => (
          <View
            key={`${d.day}-${d.title}`}
            className="mb-space-sm flex-row gap-space-md rounded-lg bg-surface-container-low p-space-md"
          >
            <View className="w-12">
              <Text className="font-label-bold text-label-lg text-primary-fixed">{d.day}</Text>
              <CapsLabel>{d.tag}</CapsLabel>
            </View>
            <View className="flex-1">
              <Text className="font-headline-sm text-headline-sm text-on-surface">{d.title}</Text>
              <Text className="font-body text-body-sm text-on-surface-variant">{d.meta}</Text>
            </View>
          </View>
        ))
      )}

      <LimeCta
        label={busy ? "Applying…" : "Apply new plan"}
        onPress={() => void handleApply()}
        icon={<ArrowRight size={18} color={color.onPrimaryFixed} />}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Keep current plan"
        onPress={() => void handleKeep()}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">Keep current plan</Text>
      </Pressable>
    </ScreenScroll>
  );
};
