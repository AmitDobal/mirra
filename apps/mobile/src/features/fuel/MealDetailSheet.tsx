import { ChefHat, ChevronLeft, Sparkles, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { CUISINE_OPTIONS } from "@/content/cuisines";
import { getMyFoodPrefs, type FoodPrefs, type PlannedMeal } from "@/lib/api";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { ChefChat } from "./ChefChat";
import { useChefStore } from "./chef-store";
import { DIET_OPTIONS } from "./diet-prefs";
import { formatPortion } from "./portion";

type Props = {
  readonly meal: PlannedMeal | null;
  /** Open straight into Chef chat (row Chef button). */
  readonly startInChat?: boolean;
  readonly onClose: () => void;
};

const labelOf = (options: readonly { id: string; label: string }[], id: string): string =>
  options.find((o) => o.id === id)?.label ?? id;

const MacroCell = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <View style={sx("flex-1 items-center rounded-lg bg-surface-container-high py-space-sm")}>
    <Text style={sx("font-headline-semi text-body-lg text-on-surface")}>{value}</Text>
    <CapsLabel>{label}</CapsLabel>
  </View>
);

const tagsFrom = (prefs: FoodPrefs | null): string[] =>
  prefs
    ? [
        ...prefs.dietTags.filter((t) => t !== "high_protein").map((t) => labelOf(DIET_OPTIONS, t)),
        ...prefs.cuisineStyles.map((c) => labelOf(CUISINE_OPTIONS, c)),
      ]
    : [];

/** Planned meal detail: macros, ingredients, recipe, and a Chef chat view (same sheet). */
export const MealDetailSheet = ({ meal, startInChat = false, onClose }: Props) => {
  const [view, setView] = useState<"detail" | "chat">("detail");
  const [tags, setTags] = useState<string[]>([]);
  const open = useChefStore((s) => s.open);
  const close = useChefStore((s) => s.close);
  const generate = useChefStore((s) => s.generate);
  const detail = useChefStore((s) => s.detail);
  const loading = useChefStore((s) => s.loading);
  const generating = useChefStore((s) => s.generating);
  const error = useChefStore((s) => s.error);
  const outOfCredits = useChefStore((s) => s.outOfCredits);

  const mealId = meal?.id;
  useEffect(() => {
    if (!mealId) return;
    setView(startInChat ? "chat" : "detail");
    void open(mealId);
    getMyFoodPrefs()
      .then((prefs) => setTags(tagsFrom(prefs)))
      .catch(() => setTags([]));
    return () => close();
  }, [mealId, startInChat, open, close]);

  if (!meal) return null;
  const recipe = detail?.recipe;
  const isAi = recipe?.source === "openai";
  const handleRetry = () => void open(meal.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss meal details"
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg"), { height: "88%" }]}
        >
          <View style={sx("mb-space-sm flex-row items-center justify-between")}>
            {view === "chat" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to meal details"
                onPress={() => setView("detail")}
                style={sx("h-11 flex-row items-center gap-1")}
              >
                <ChevronLeft size={20} color={color.primaryFixed} />
                <CapsLabel tone="lime">Meal</CapsLabel>
              </Pressable>
            ) : (
              <CapsLabel tone="lime">{meal.slot}</CapsLabel>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={sx("h-11 w-11 items-center justify-center")}
            >
              <X size={22} color={color.onSurfaceVariant} />
            </Pressable>
          </View>
          <Text numberOfLines={2} style={sx("mb-space-sm font-headline-sm text-headline-sm text-on-surface")}>
            {meal.title}
          </Text>

          {view === "chat" ? (
            <ChefChat />
          ) : (
            <>
              <ScrollView style={sx("flex-1")} showsVerticalScrollIndicator={false}>
                <View style={sx("flex-row gap-space-sm")}>
                  <MacroCell label="kcal" value={`${meal.fit === "approx" ? "~" : ""}${meal.kcal}`} />
                  <MacroCell label="protein" value={`${Math.round(meal.proteinG)}g`} />
                  <MacroCell label="carbs" value={`${Math.round(meal.carbsG)}g`} />
                  <MacroCell label="fat" value={`${Math.round(meal.fatG)}g`} />
                </View>
                {tags.length ? (
                  <View style={sx("mt-space-sm flex-row flex-wrap gap-space-sm")}>
                    {tags.map((t) => (
                      <View key={t} style={sx("rounded-full bg-surface-container-highest px-space-md py-1")}>
                        <Text style={sx("font-label text-label-md text-on-surface")}>{t}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={sx("mt-space-md")}>
                  <CapsLabel>Ingredients</CapsLabel>
                  {meal.items.map((item) => (
                    <View key={item.foodId} style={sx("flex-row items-center gap-space-sm py-1")}>
                      <Text numberOfLines={1} style={sx("flex-1 font-body-medium text-body-md text-on-surface")}>
                        {item.name}
                      </Text>
                      <Text style={sx("font-label-bold text-label-md text-on-surface-variant")}>{formatPortion(item)}</Text>
                      <Text style={[sx("text-right font-label-bold text-label-md text-primary-fixed-dim"), { minWidth: 44 }]}>
                        {Math.round(item.grams)} g
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={sx("mt-space-md")}>
                  <View style={sx("flex-row items-center justify-between")}>
                    <CapsLabel>Recipe</CapsLabel>
                    {recipe ? (
                      <CapsLabel tone={isAi ? "lime" : "muted"}>
                        {recipe.prepMinutes + recipe.cookMinutes} min · {isAi ? "AI recipe" : "Basic recipe"}
                      </CapsLabel>
                    ) : null}
                  </View>
                  {loading ? (
                    <View accessibilityLabel="Loading recipe" style={sx("items-center py-space-md")}>
                      <ActivityIndicator color={color.primaryFixed} />
                    </View>
                  ) : null}
                  {error ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={handleRetry} style={sx("py-space-sm")}>
                      <CapsLabel tone="alert">{error} Tap to retry.</CapsLabel>
                    </Pressable>
                  ) : null}
                  {recipe?.steps.map((step, i) => (
                    <Text key={step} style={sx("mt-1 font-body text-body-md text-on-surface")}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                  {outOfCredits ? (
                    <CapsLabel tone="alert">Out of AI credits. The basic recipe stays free.</CapsLabel>
                  ) : null}
                  {recipe && !isAi ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Write an AI recipe, ${detail?.costs.recipe ?? 2} credits`}
                      disabled={generating}
                      onPress={() => void generate()}
                      style={sx("mt-space-sm h-11 flex-row items-center gap-1.5")}
                    >
                      {generating ? <ActivityIndicator color={color.primaryFixed} /> : <Sparkles size={16} color={color.primaryFixed} />}
                      <CapsLabel tone="lime">
                        {generating ? "Writing…" : `AI recipe · ${detail?.costs.recipe ?? 2} credits`}
                      </CapsLabel>
                    </Pressable>
                  ) : null}
                </View>
              </ScrollView>
              <LimeCta
                label="Ask Chef"
                accessibilityLabel={`Ask Chef about ${meal.title}`}
                onPress={() => setView("chat")}
                icon={<ChefHat size={18} color={color.onPrimaryFixed} />}
                style={{ height: 48, marginTop: 8 }}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
