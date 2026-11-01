import { Utensils } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { Meal } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color, radius } from "@/theme/tokens";

import { NA } from "./history-model";

const SLOT_LABEL: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const mealMeta = (m: Meal): string => {
  const time = new Date(m.eatenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const slot = SLOT_LABEL[m.mealSlot] ?? "Meal";
  return m.proteinG > 0 ? `${slot} · ${time} · ${Math.round(m.proteinG)}g Protein` : `${slot} · ${time}`;
};

const MealRow = ({ meal }: { meal: Meal }) => (
  <View style={sx("mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-low p-space-sm")}>
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.DEFAULT,
        backgroundColor: color.surfaceContainerHighest,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Utensils size={20} color={color.onSurfaceVariant} />
    </View>
    <View style={sx("flex-1")}>
      <Text numberOfLines={1} style={sx("font-headline-semi text-body-lg text-on-surface")}>
        {meal.name}
      </Text>
      <Text numberOfLines={1} style={sx("font-body text-body-sm text-on-surface-variant")}>
        {mealMeta(meal)}
      </Text>
    </View>
    <View style={sx("rounded-full bg-surface-container-highest px-3 py-1")}>
      <Text style={sx("font-label text-label-md text-primary-fixed")}>
        {meal.kcal > 0 ? `${meal.kcal} kcal` : NA}
      </Text>
    </View>
  </View>
);

type Props = {
  readonly meals: readonly Meal[];
  readonly expanded: boolean;
  readonly hasMore: boolean;
  readonly onSeeAll: () => void;
};

/** Newest logged meals (`GET /v1/meals`). */
export const RecentMeals = ({ meals, expanded, hasMore, onSeeAll }: Props) => (
  <View>
    <View style={sx("mb-space-sm flex-row items-center justify-between")}>
      <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>Recent Logged Meals</Text>
      {!expanded && (hasMore || meals.length > 0) ? (
        <Pressable accessibilityRole="button" accessibilityLabel="See all meals" hitSlop={12} onPress={onSeeAll}>
          <Text style={sx("font-label text-label-md text-primary-fixed")}>See All</Text>
        </Pressable>
      ) : null}
    </View>
    {meals.length === 0 ? (
      <View style={sx("items-center rounded-lg bg-surface-container-low p-space-md")}>
        <Text style={sx("font-display text-headline-md text-on-surface-variant")}>{NA}</Text>
        <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>No meals logged yet</Text>
      </View>
    ) : (
      meals.map((m) => <MealRow key={m.id} meal={m} />)
    )}
  </View>
);
