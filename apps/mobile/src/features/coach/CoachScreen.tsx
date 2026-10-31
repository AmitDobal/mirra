import { router } from "expo-router";
import { Check, Zap } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { copy } from "@/content/copy";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { selectLoggedKcal, useFuelStore } from "@/features/fuel/fuel-store";
import { usePlanStore } from "@/stores/plan-store";
import { kcalStatus, proteinChip } from "@/lib/accountability";

import { AdviseCard } from "./AdviseCard";
import { useCoachStore } from "./coach-store";
import { sx } from "@/theme/sx";

const formatUpdatedAgo = (cachedAt: number | null, throttled: boolean): string | null => {
  if (cachedAt == null) return null;
  const mins = Math.floor((Date.now() - cachedAt) / 60_000);
  const age = mins < 1 ? "just now" : `${mins}m ago`;
  return throttled ? `Up to date · updated ${age}` : `Updated ${age}`;
};

/** S20 Daily check-in — AI advise + SQLite rebuild on skip. */
export const CoachScreen = () => {
  const c = copy.coach;
  const readiness = useCoachStore((s) => s.readiness);
  const vectorId = useCoachStore((s) => s.vectorId);
  const notice = useCoachStore((s) => s.notice);
  const weekLogged = useCoachStore((s) => s.weekLogged);
  const adviseMessage = useCoachStore((s) => s.adviseMessage);
  const advisePills = useCoachStore((s) => s.advisePills);
  const vectors = useCoachStore((s) => s.vectors);
  const adviseLoading = useCoachStore((s) => s.adviseLoading);
  const setReadiness = useCoachStore((s) => s.setReadiness);
  const setVectorId = useCoachStore((s) => s.setVectorId);
  const submitCheckIn = useCoachStore((s) => s.submitCheckIn);
  const checkedInDate = useCoachStore((s) => s.checkedInDate);
  const hydrate = useCoachStore((s) => s.hydrate);
  const fetchAdvise = useCoachStore((s) => s.fetchAdvise);
  const forceRefreshAdvise = useCoachStore((s) => s.forceRefreshAdvise);
  const adviseCachedAt = useCoachStore((s) => s.adviseCachedAt);
  const adviseThrottled = useCoachStore((s) => s.adviseThrottled);
  const keep = useCoachStore((s) => s.keep);
  const [busy, setBusy] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyIn = checkedInDate === todayKey;
  const meals = useFuelStore((s) => s.meals);
  const hydrateFuel = useFuelStore((s) => s.hydrate);
  const plan = usePlanStore((s) => s.plan);
  const fuelTarget = useFuelStore((s) => s.target);
  const proteinTarget = useFuelStore((s) => s.proteinTarget);
  const logged = selectLoggedKcal(meals);
  const protein = meals.reduce((sum, m) => sum + m.proteinG, 0);
  const kcal = kcalStatus(logged, fuelTarget);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void hydrate();
    void hydrateFuel();
  }, [hydrate, hydrateFuel]);

  useEffect(() => {
    void fetchAdvise();
  }, [fetchAdvise, readiness]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([hydrate(), hydrateFuel(), forceRefreshAdvise()]);
    } finally {
      setRefreshing(false);
    }
  }, [hydrate, hydrateFuel, forceRefreshAdvise]);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const liftDays = plan?.days.filter((d) => d.workout != null).length ?? 0;
  const title = readiness === "rest" ? c.titleRest : c.titlePush;
  const updatedLabel = formatUpdatedAgo(adviseCachedAt, adviseThrottled);

  const handleSubmit = async () => {
    if (busy || alreadyIn) return;
    setBusy(true);
    const next = await submitCheckIn();
    setBusy(false);
    if (next === "failed") return; // stay here; notice explains the failure
    if (next === "rebuild") {
      router.push("/(tabs)/rebuild");
      return;
    }
    // Land on Today so checklist / chip reflect the new check-in.
    router.replace("/(tabs)/today");
  };

  const handleKeep = async () => {
    await keep();
    router.replace("/(tabs)/today");
  };

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View>
          <CapsLabel tone="lime">{c.brand}</CapsLabel>
          <Text style={sx("font-headline text-headline-lg text-on-surface")}>{c.title}</Text>
        </View>
        <View style={sx("h-11 w-11 items-center justify-center rounded-full bg-primary-fixed")}>
          <Zap size={20} color={color.onPrimaryFixed} />
        </View>
      </View>

      <CapsLabel>{dateLabel}</CapsLabel>
      <Text style={sx("mb-space-md font-body text-body-sm text-on-surface-variant")}>
        {alreadyIn
          ? notice ?? "Checked in today. Checklist on Today is up to date."
          : notice ?? c.checkInReady}
      </Text>

      <AdviseCard
        title={title}
        message={adviseMessage}
        pills={advisePills}
        onSelectVector={setVectorId}
        loading={adviseLoading}
        updatedLabel={updatedLabel}
        readiness={readiness}
        onReadinessChange={setReadiness}
        onRefresh={() => void forceRefreshAdvise()}
      />

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <View style={sx("flex-1 rounded-lg bg-surface-container-high p-space-md")}>
          <CapsLabel>This plan</CapsLabel>
          <Text style={sx("mt-1 font-headline-sm text-headline-sm text-primary-fixed")}>
            {liftDays ? "Lift days set" : "No lifts yet"}
          </Text>
          <Text style={sx("mt-space-sm font-display text-headline-md text-on-surface")}>
            {weekLogged}/{liftDays || "—"}
          </Text>
          <CapsLabel>Check-ins logged</CapsLabel>
        </View>
        <View style={sx("flex-1 rounded-lg bg-surface-container-high p-space-md")}>
          <CapsLabel tone={kcal.over ? "alert" : "muted"}>
            {kcal.over ? "Over target" : "Fuel today"}
          </CapsLabel>
          <Text
            style={sx(`mt-space-sm font-display text-headline-lg ${
              kcal.over ? "text-error" : "text-on-surface"
            }`)}
          >
            {kcal.over ? `OVER by ${kcal.overBy}` : `${logged}/${fuelTarget || "—"}`}
          </Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            {proteinChip(protein, proteinTarget)}
          </Text>
        </View>
      </View>

      <CapsLabel style={sx("mb-space-sm")}>{c.vectorsLabel}</CapsLabel>
      {vectors.map((v) => {
        const selected = vectorId === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setVectorId(v.id)}
            style={sx(`mb-space-sm rounded-lg border p-space-md ${
              selected
                ? "border-primary-fixed bg-surface-container-low"
                : "border-transparent bg-surface-container-high"
            }`)}
          >
            <View style={sx("flex-row items-center justify-between")}>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{v.title}</Text>
              {v.recommended ? (
                <View style={sx("rounded-full bg-primary-fixed px-2 py-0.5")}>
                  <CapsLabel tone="dark">Recommended</CapsLabel>
                </View>
              ) : null}
            </View>
            <Text style={sx("mt-1 font-body text-body-md text-on-surface-variant")}>{v.detail}</Text>
            {selected ? (
              <View style={sx("mt-space-sm flex-row items-center gap-1")}>
                <Check size={14} color={color.primaryFixed} />
                <CapsLabel tone="lime">Selected</CapsLabel>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <LimeCta
        label="Adjust plan with AI"
        accessibilityLabel="Adjust plan with AI"
        variant="dark"
        onPress={() => router.push("/(tabs)/plan-chat")}
        style={sx("mb-space-sm")}
      />
      <LimeCta
        label={
          alreadyIn
            ? "Checked in · back to Today"
            : busy
              ? c.submitting
              : c.submit
        }
        onPress={() => {
          if (alreadyIn) {
            router.replace("/(tabs)/today");
            return;
          }
          void handleSubmit();
        }}
      />
      {!alreadyIn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.keep}
          onPress={() => void handleKeep()}
          style={sx("mt-space-md items-center py-space-sm")}
        >
          <Text style={sx("font-label text-label-md text-on-surface-variant")}>{c.keep}</Text>
        </Pressable>
      ) : null}
    </ScreenScroll>
  );
};
