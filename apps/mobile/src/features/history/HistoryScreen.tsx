import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, CalendarCheck } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useFuelStore } from "@/features/fuel/fuel-store";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { CalorieChart } from "./CalorieChart";
import { historyWindow, todayIso, windowLabel } from "./history-model";
import { useHistoryStore } from "./history-store";
import { KpiRow } from "./KpiRow";
import { MacroAdherence } from "./MacroAdherence";
import { RangeSegmented, WindowNav } from "./RangeControls";
import { RecentMeals } from "./RecentMeals";

const handleBack = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/fuel");
};

/** S18b Nutrition history — Day/Week/Month kcal + workout charts (AMI-133). */
export const HistoryScreen = () => {
  const range = useHistoryStore((s) => s.range);
  const anchor = useHistoryStore((s) => s.anchor);
  const days = useHistoryStore((s) => s.days);
  const kpis = useHistoryStore((s) => s.kpis);
  const macros = useHistoryStore((s) => s.macros);
  const hasData = useHistoryStore((s) => s.hasData);
  const source = useHistoryStore((s) => s.source);
  const loading = useHistoryStore((s) => s.loading);
  const error = useHistoryStore((s) => s.error);
  const meals = useHistoryStore((s) => s.meals);
  const mealsCursor = useHistoryStore((s) => s.mealsCursor);
  const mealsExpanded = useHistoryStore((s) => s.mealsExpanded);
  const load = useHistoryStore((s) => s.load);
  const loadMeals = useHistoryStore((s) => s.loadMeals);
  const expandMeals = useHistoryStore((s) => s.expandMeals);
  const setRange = useHistoryStore((s) => s.setRange);
  const shift = useHistoryStore((s) => s.shift);

  const proteinTarget = useFuelStore((s) => s.proteinTarget);
  const carbsTarget = useFuelStore((s) => s.carbsTarget);
  const fatTarget = useFuelStore((s) => s.fatTarget);
  const hydrateFuel = useFuelStore((s) => s.hydrate);

  const [refreshing, setRefreshing] = useState(false);

  // Mount + refocus: the store skips the network while the 1h cache is fresh.
  useFocusEffect(
    useCallback(() => {
      void load();
      void loadMeals();
      void hydrateFuel();
    }, [load, loadMeals, hydrateFuel]),
  );

  // Pull-to-refresh always bypasses the TTL.
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load({ force: true }), loadMeals({ force: true }), hydrateFuel()]);
    } finally {
      setRefreshing(false);
    }
  }, [load, loadMeals, hydrateFuel]);

  const handleToday = () => {
    useHistoryStore.setState({ anchor: todayIso() });
    void load();
  };

  const window = historyWindow(range, anchor);
  const canGoForward = window.to < todayIso();

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <ArrowLeft size={20} color={color.onSurface} />
        </Pressable>
        <View style={sx("items-center")}>
          <Text style={sx("font-headline text-headline-md text-on-surface")}>HISTORY</Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>Nutrition &amp; Energy</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to today"
          onPress={handleToday}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <CalendarCheck size={20} color={color.onSurface} />
        </Pressable>
      </View>

      <RangeSegmented value={range} onChange={(r) => void setRange(r)} />
      <WindowNav
        label={windowLabel(range, window)}
        canGoForward={canGoForward}
        onPrev={() => void shift(-1)}
        onNext={() => void shift(1)}
      />

      {error ? (
        <Text accessibilityRole="alert" style={sx("mb-space-sm font-body text-body-sm text-error")}>
          {error}
        </Text>
      ) : null}
      {source === "cache" ? (
        <Text style={sx("mb-space-sm font-label text-label-caps text-on-surface-variant")}>
          Showing saved data
        </Text>
      ) : null}

      <KpiRow kpis={kpis} loading={loading && !hasData} />
      <CalorieChart days={days} range={range} target={kpis.target} hasData={hasData} loading={loading} />
      <MacroAdherence
        averages={macros}
        proteinTarget={proteinTarget}
        carbsTarget={carbsTarget}
        fatTarget={fatTarget}
      />
      <RecentMeals
        meals={meals}
        expanded={mealsExpanded}
        hasMore={mealsCursor !== null}
        onSeeAll={() => void expandMeals()}
      />
    </ScreenScroll>
  );
};
