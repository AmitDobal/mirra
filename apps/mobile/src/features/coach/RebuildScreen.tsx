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
import { sx } from "@/theme/sx";

/** S21 Rebuild preview — Stitch layout; Apply / Keep preserved. */
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
      active: i === 0,
    })) ?? [];

  const metrics = [
    {
      label: "Total Vol",
      value: String(source?.days.filter((d) => d.workout).length ?? 0),
      meta: "sessions",
      tone: "lime" as const,
    },
    {
      label: "Burn Target",
      value: summary?.kcalTarget != null ? String(summary.kcalTarget) : "—",
      meta: "kcal",
      tone: "lav" as const,
    },
    {
      label: "Protein",
      value: summary?.proteinG != null ? String(summary.proteinG) : "—",
      meta: "g floor",
      tone: "neutral" as const,
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
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => void handleKeep()}
            style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
          >
            <X size={22} color={color.onSurface} />
          </Pressable>
          <View>
            <CapsLabel tone="lime">AI Optimization</CapsLabel>
            <Text style={sx("font-headline-sm text-headline-sm uppercase text-on-surface")}>
              Rebuild Preview
            </Text>
          </View>
        </View>
      </View>

      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-2")}>
          <View style={sx("h-2.5 w-2.5 rounded-full bg-primary-container")} />
          <Text style={sx("font-headline-sm text-headline-sm uppercase text-on-surface")}>
            Plan Recalibration
          </Text>
        </View>
        <View style={sx("rounded-full bg-surface-container-high px-3 py-1")}>
          <CapsLabel tone="lime">v2.4 AUTO-SYNC</CapsLabel>
        </View>
      </View>

      <View style={sx("mb-space-lg overflow-hidden rounded-lg bg-surface-container-high p-space-lg")}>
        <View style={sx("mb-space-sm self-start rounded-full bg-surface-container-lowest px-2.5 py-1")}>
          <CapsLabel tone="lime">
            {notice ?? "ZERO GUILT SHIFT · 100% VOLUME"}
          </CapsLabel>
        </View>
        <Text style={sx("font-headline text-headline-lg text-on-surface")}>
          Your week, re-calibrated.
        </Text>
        <Text style={sx("mt-space-sm font-body text-body-md text-on-surface-variant")}>
          {summary?.outcomeLine ||
            "Missed stimulus redistributed. Hypertrophy strain stays on target."}
        </Text>
        <Image
          source={s21RebuildPreview.athleteStretching}
          accessibilityLabel="Rebuild preview"
          style={{ width: "100%", height: 120, borderRadius: 12, marginTop: 12 }}
          resizeMode="cover"
        />
        <Text style={sx("mt-space-sm font-headline-sm text-headline-sm text-on-surface")}>
          Smarter rhythm, zero punishment.
        </Text>
      </View>

      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <CapsLabel tone="lime">Net metric retention</CapsLabel>
        <CapsLabel>All goals active</CapsLabel>
      </View>
      <View style={sx("mb-space-lg flex-row gap-2")}>
        {metrics.map((met) => (
          <View key={met.label} style={sx("flex-1 rounded-DEFAULT bg-surface-container p-3")}>
            <CapsLabel>{met.label}</CapsLabel>
            <Text style={sx("mt-1 font-headline text-headline-md text-on-surface")}>
              {met.value}
            </Text>
            <Text
              style={sx(
                `font-body text-body-sm ${
                  met.tone === "lime" ? "text-primary-fixed" : "text-on-surface-variant"
                }`,
              )}
            >
              {met.meta}
            </Text>
          </View>
        ))}
      </View>

      <CapsLabel style={sx("mb-space-sm")}>Rebuilt schedule</CapsLabel>
      {days.length === 0 ? (
        <View style={sx("mb-space-sm rounded-lg bg-surface-container-low p-space-md")}>
          <Text style={sx("font-body text-body-md text-on-surface-variant")}>
            No plan days to preview yet.
          </Text>
        </View>
      ) : (
        days.map((d) => (
          <View
            key={`${d.day}-${d.title}`}
            style={sx(
              `mb-space-sm flex-row gap-space-md rounded-lg p-space-md ${
                d.active
                  ? "border border-primary-fixed bg-surface-container-high"
                  : "bg-surface-container-low"
              }`,
            )}
          >
            <View style={sx("w-12")}>
              <Text style={sx("font-label-bold text-label-lg text-primary-fixed")}>{d.day}</Text>
              <CapsLabel>{d.tag}</CapsLabel>
            </View>
            <View style={sx("flex-1")}>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{d.title}</Text>
              <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{d.meta}</Text>
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
        style={sx("mt-space-md items-center py-space-sm")}
      >
        <Text style={sx("font-label text-label-md text-on-surface-variant")}>
          Keep current plan
        </Text>
      </Pressable>
    </ScreenScroll>
  );
};
