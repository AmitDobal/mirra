import { router, useLocalSearchParams } from "expo-router";
import { BarChart3, Camera, Plus } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  type ScrollViewInstance,
  Text,
  View,
} from "react-native";

import { s18Fuel } from "../../../assets/stitch";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { kcalStatus } from "@/lib/accountability";

import { CalorieDonut } from "./CalorieDonut";
import { DescribeMealModal } from "./DescribeMealModal";
import { HydrationCard } from "./HydrationCard";
import { MacroMeters } from "./MacroMeters";
import { useMealEditor } from "./MealEditor";
import { MealPlanSection } from "./MealPlanSection";
import { useMealPlanStore } from "./meal-plan-store";
import { promptRebalanceIfOffPlan } from "./rebalance-prompt";
import { selectLoggedKcal, useFuelStore } from "./fuel-store";
import { sx } from "@/theme/sx";

const MEAL_IMGS = [
  s18Fuel.mealProteinOats,
  s18Fuel.mealChickenQuinoa,
  s18Fuel.mealSalmonAsparagus,
] as const;

/** Keeps the plan header clear of the status bar after a deep-link scroll. */
const PLAN_SCROLL_INSET = 72;

/** S18 Fuel dashboard — SQLite meals. */
export const FuelScreen = () => {
  const meals = useFuelStore((s) => s.meals);
  const target = useFuelStore((s) => s.target);
  const proteinTarget = useFuelStore((s) => s.proteinTarget);
  const hydrate = useFuelStore((s) => s.hydrate);
  const snapMeal = useFuelStore((s) => s.snapMeal);
  const describeMeal = useFuelStore((s) => s.describeMeal);
  const tip = useFuelStore((s) => s.tip);
  const clearTip = useFuelStore((s) => s.clearTip);
  const estimating = useFuelStore((s) => s.estimating);
  const carbsTarget = useFuelStore((s) => s.carbsTarget);
  const carbsLogged = useFuelStore((s) => s.carbsLogged);
  const fatTarget = useFuelStore((s) => s.fatTarget);
  const fatLogged = useFuelStore((s) => s.fatLogged);
  const waterLoggedMl = useFuelStore((s) => s.waterLoggedMl);
  const waterTargetMl = useFuelStore((s) => s.waterTargetMl);
  const addWater = useFuelStore((s) => s.addWater);

  const hydratePlan = useMealPlanStore((s) => s.hydrate);
  const ensureAfterOnboarding = useMealPlanStore((s) => s.ensureAfterOnboarding);
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const planY = useRef<number | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [describeOpen, setDescribeOpen] = useState(false);
  const mealEditor = useMealEditor();

  const scrollToPlan = useCallback(() => {
    if (section !== "plan" || planY.current === null) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, planY.current - PLAN_SCROLL_INSET), animated: true });
  }, [section]);

  useEffect(() => {
    void hydrate();
    void hydratePlan().then(() => ensureAfterOnboarding());
  }, [hydrate, hydratePlan, ensureAfterOnboarding]);

  useEffect(scrollToPlan, [scrollToPlan]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([hydrate(), hydratePlan()]);
    } finally {
      setRefreshing(false);
    }
  }, [hydrate, hydratePlan]);

  const logged = selectLoggedKcal(meals);
  const kcal = kcalStatus(logged, target || 0);
  const pct = kcal.pct;
  const protein = meals.reduce((s, meal) => s + meal.proteinG, 0);
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleLog = () => router.push("/(tabs)/log-meal");
  const handleSnap = async () => {
    const meal = await snapMeal();
    if (meal) void promptRebalanceIfOffPlan(meal.calories);
  };
  const submitDescribe = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const meal = await describeMeal(trimmed);
    if (meal) void promptRebalanceIfOffPlan(meal.calories);
  };

  const handleDescribePress = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Describe meal",
        "What did you eat?",
        (value) => {
          if (value) void submitDescribe(value);
        },
        "plain-text",
      );
      return;
    }
    setDescribeOpen(true);
  };

  return (
    <ScreenScroll scrollRef={scrollRef} refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View>
          <Text style={sx("font-headline text-headline-lg text-on-surface")}>Fuel</Text>
          <Text style={sx("font-body text-body-md text-on-surface-variant")}>
            Target {target || "—"} kcal
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open nutrition history"
          onPress={() => router.push("/(tabs)/history")}
          style={sx("flex-row items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-2")}
        >
          <BarChart3 size={16} color={color.primaryFixed} />
          <Text style={sx("font-label text-label-md text-on-surface")}>History</Text>
        </Pressable>
      </View>

      {tip ? (
        <Pressable
          accessibilityRole="button"
          onPress={clearTip}
          style={sx("mb-space-sm max-w-full flex-row items-center gap-1.5 self-start rounded-full bg-primary-fixed/20 px-3 py-1")}
        >
          <AiBadge label={false} tone="lime" size={16} />
          <CapsLabel tone={kcal.over && !estimating ? "alert" : "lime"}>
            {estimating ? "Estimating…" : tip}
          </CapsLabel>
        </Pressable>
      ) : null}

      <View style={sx("mb-space-md overflow-hidden rounded-2xl bg-surface-container-low p-space-md")}>
        <CapsLabel>{dateLabel}</CapsLabel>
        <View style={sx("mt-space-sm flex-row items-center justify-between gap-space-md")}>
          <View style={sx("flex-1")}>
            <CapsLabel tone={kcal.over ? "alert" : "muted"}>
              {kcal.over ? "Over target" : "Remaining budget"}
            </CapsLabel>
            <View style={sx("mt-space-xs flex-row items-baseline gap-space-xs")}>
              <Text
                style={sx(`font-display text-display-lg ${
                  kcal.over ? "text-error" : "text-on-surface"
                }`)}
              >
                {kcal.over ? `+${kcal.overBy}` : kcal.left}
              </Text>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface-variant")}>
                {kcal.over ? "kcal over" : "kcal left"}
              </Text>
            </View>
            <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
              {logged} logged · {target || "—"} target
            </Text>
          </View>
          <CalorieDonut pct={pct} over={kcal.over} />
        </View>
        <MacroMeters
          protein={{ logged: protein, target: proteinTarget }}
          carbs={{ logged: carbsLogged, target: carbsTarget }}
          fat={{ logged: fatLogged, target: fatTarget }}
        />
      </View>

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <LimeCta
          label="Log meal"
          onPress={handleLog}
          style={sx("flex-1")}
          icon={<Plus size={18} color={color.onPrimaryFixed} />}
        />
        <LimeCta
          label={estimating ? "…" : "Snap"}
          onPress={() => void handleSnap()}
          variant="dark"
          icon={<Camera size={18} color={color.onSurface} />}
        />
        <LimeCta
          label={estimating ? "…" : "Describe"}
          accessibilityLabel="Describe meal with AI"
          onPress={handleDescribePress}
          variant="dark"
          icon={<AiBadge label={false} tone="lime" size={16} />}
        />
      </View>

      <View
        onLayout={(e) => {
          planY.current = e.nativeEvent.layout.y;
          scrollToPlan();
        }}
      >
        <MealPlanSection />
      </View>

      <HydrationCard
        loggedMl={waterLoggedMl}
        targetMl={waterTargetMl}
        onAdd={(ml) => void addWater(ml)}
      />

      <View style={sx("mb-space-sm mt-space-md flex-row items-center justify-between")}>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>Today&apos;s Meals</Text>
        <CapsLabel>{meals.length} logged</CapsLabel>
      </View>

      {meals.length === 0 ? (
        <View style={sx("mb-space-sm rounded-lg bg-surface-container-high p-space-md")}>
          <Text style={sx("font-body text-body-md text-on-surface-variant")}>
            No meals yet — log or snap one.
          </Text>
        </View>
      ) : (
        meals.map((meal, i) => (
          <Pressable
            key={meal.id}
            accessibilityRole="button"
            accessibilityLabel={`${meal.name}. Long press to edit or delete`}
            accessibilityActions={[{ name: "longpress", label: "Edit or delete" }]}
            onAccessibilityAction={() => mealEditor.openActions(meal)}
            onLongPress={() => mealEditor.openActions(meal)}
            style={sx("mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md")}
          >
            <Image
              source={MEAL_IMGS[i % MEAL_IMGS.length]!}
              accessibilityLabel={meal.name}
              style={{ width: 56, height: 56, borderRadius: 8 }}
              resizeMode="cover"
            />
            <View style={sx("flex-1")}>
              <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
                {meal.slot} · {meal.time}
              </Text>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{meal.name}</Text>
              <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
                {meal.calories} kcal · {Math.round(meal.proteinG)}g Protein
              </Text>
            </View>
            <View style={sx("h-8 w-8 items-center justify-center rounded-full bg-primary-fixed")}>
              <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>✓</Text>
            </View>
          </Pressable>
        ))
      )}

      {mealEditor.sheet}
      <DescribeMealModal
        visible={describeOpen}
        onClose={() => setDescribeOpen(false)}
        onSubmit={(text) => void submitDescribe(text)}
      />
    </ScreenScroll>
  );
};
