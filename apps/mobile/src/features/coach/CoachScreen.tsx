import { router } from "expo-router";
import { Bed, Check, Zap } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { copy } from "@/content/copy";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { selectLoggedKcal, useFuelStore } from "@/features/fuel/fuel-store";
import { usePlanStore } from "@/stores/plan-store";

import { useCoachStore } from "./coach-store";

/** S20 Daily check-in — AI advise + SQLite rebuild on skip. */
export const CoachScreen = () => {
  const c = copy.coach;
  const readiness = useCoachStore((s) => s.readiness);
  const vectorId = useCoachStore((s) => s.vectorId);
  const notice = useCoachStore((s) => s.notice);
  const weekLogged = useCoachStore((s) => s.weekLogged);
  const adviseMessage = useCoachStore((s) => s.adviseMessage);
  const vectors = useCoachStore((s) => s.vectors);
  const adviseLoading = useCoachStore((s) => s.adviseLoading);
  const setReadiness = useCoachStore((s) => s.setReadiness);
  const setVectorId = useCoachStore((s) => s.setVectorId);
  const submitCheckIn = useCoachStore((s) => s.submitCheckIn);
  const hydrate = useCoachStore((s) => s.hydrate);
  const fetchAdvise = useCoachStore((s) => s.fetchAdvise);
  const keep = useCoachStore((s) => s.keep);
  const [busy, setBusy] = useState(false);
  const meals = useFuelStore((s) => s.meals);
  const hydrateFuel = useFuelStore((s) => s.hydrate);
  const plan = usePlanStore((s) => s.plan);
  const logged = selectLoggedKcal(meals);

  useEffect(() => {
    void hydrate();
    void hydrateFuel();
  }, [hydrate, hydrateFuel]);

  useEffect(() => {
    void fetchAdvise();
  }, [fetchAdvise, readiness]);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const liftDays = plan?.days.filter((d) => d.workout != null).length ?? 0;
  const title = readiness === "rest" ? c.titleRest : c.titlePush;

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    const next = await submitCheckIn();
    setBusy(false);
    if (next === "rebuild") router.push("/(tabs)/rebuild");
  };

  const handleKeep = async () => {
    await keep();
    router.replace("/(tabs)/today");
  };

  return (
    <ScreenScroll>
      <View className="mb-space-md flex-row items-center justify-between">
        <View>
          <CapsLabel tone="lime">{c.brand}</CapsLabel>
          <Text className="font-headline text-headline-lg text-on-surface">{c.title}</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-fixed">
          <Zap size={20} color={color.onPrimaryFixed} />
        </View>
      </View>

      <CapsLabel>{dateLabel}</CapsLabel>
      <Text className="mb-space-md font-body text-body-sm text-on-surface-variant">
        {notice ?? c.checkInReady}
      </Text>

      <View className="mb-space-md rounded-lg bg-primary-fixed p-space-lg">
        <CapsLabel tone="dark">{c.calibration}</CapsLabel>
        <Text className="mt-space-sm font-headline text-headline-lg text-on-primary-fixed">
          {title}
        </Text>
        {adviseLoading ? (
          <View className="mt-space-sm flex-row items-center gap-2">
            <ActivityIndicator color={color.onPrimaryFixed} />
            <Text className="font-body-medium text-body-md text-on-primary-fixed/85">
              {c.loading}
            </Text>
          </View>
        ) : (
          <Text className="mt-space-sm font-body-medium text-body-md text-on-primary-fixed/85">
            {adviseMessage}
          </Text>
        )}
        <View className="mt-space-md flex-row gap-space-sm">
          <Chip
            label={c.push}
            active={readiness === "push"}
            onPress={() => setReadiness("push")}
          />
          <Chip
            label={c.rest}
            Icon={Bed}
            active={readiness === "rest"}
            onPress={() => setReadiness("rest")}
          />
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>This plan</CapsLabel>
          <Text className="mt-1 font-headline-sm text-headline-sm text-primary-fixed">
            {liftDays ? "Lift days set" : "No lifts yet"}
          </Text>
          <Text className="mt-space-sm font-display text-headline-md text-on-surface">
            {weekLogged}/{liftDays || "—"}
          </Text>
          <CapsLabel>Check-ins logged</CapsLabel>
        </View>
        <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Fuel today</CapsLabel>
          <Text className="mt-space-sm font-display text-headline-lg text-on-surface">
            {logged || "—"}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">kcal logged today</Text>
        </View>
      </View>

      <CapsLabel className="mb-space-sm">{c.vectorsLabel}</CapsLabel>
      {vectors.map((v) => {
        const selected = vectorId === v.id;
        return (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => setVectorId(v.id)}
            className={`mb-space-sm rounded-lg border p-space-md ${
              selected
                ? "border-primary-fixed bg-surface-container-low"
                : "border-transparent bg-surface-container-high"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-headline-sm text-headline-sm text-on-surface">{v.title}</Text>
              {v.recommended ? (
                <View className="rounded-full bg-primary-fixed px-2 py-0.5">
                  <CapsLabel tone="dark">Recommended</CapsLabel>
                </View>
              ) : null}
            </View>
            <Text className="mt-1 font-body text-body-md text-on-surface-variant">{v.detail}</Text>
            {selected ? (
              <View className="mt-space-sm flex-row items-center gap-1">
                <Check size={14} color={color.primaryFixed} />
                <CapsLabel tone="lime">Selected</CapsLabel>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <LimeCta
        label={busy ? c.submitting : c.submit}
        onPress={() => void handleSubmit()}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.keep}
        onPress={() => void handleKeep()}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">{c.keep}</Text>
      </Pressable>
    </ScreenScroll>
  );
};

const Chip = ({
  label,
  active,
  Icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  Icon?: typeof Bed;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    onPress={onPress}
    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
      active ? "bg-on-primary-fixed" : "bg-on-primary-fixed/15"
    }`}
  >
    {Icon ? <Icon size={14} color={active ? color.primaryFixed : color.onPrimaryFixed} /> : null}
    <Text
      className={`font-label text-label-md ${
        active ? "text-primary-fixed" : "text-on-primary-fixed"
      }`}
    >
      {label}
    </Text>
  </Pressable>
);
