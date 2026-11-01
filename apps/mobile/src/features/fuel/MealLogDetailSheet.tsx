import { TriangleAlert, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { cacheMediaContent, type Meal } from "@/lib/api";
import { formatLocalDateTime } from "@/lib/datetime";
import { logger, errorMessage } from "@/lib/logger";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { ingredientMeta, microsOf, slotLabelOf } from "./meal-log-detail-model";

type Props = {
  readonly meal: Meal | null;
  readonly onClose: () => void;
};

const MacroCell = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <View style={sx("flex-1 items-center rounded-lg bg-surface-container-high py-space-sm")}>
    <Text style={sx("font-headline-semi text-body-lg text-on-surface")}>{value}</Text>
    <CapsLabel>{label}</CapsLabel>
  </View>
);

/** Authenticated meal photo (`mediaId`) → cached file; null when absent or unreachable. */
const useMealPhoto = (mediaId: string | null | undefined): string | null => {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    setUri(null);
    if (!mediaId) return;
    let live = true;
    cacheMediaContent(mediaId)
      .then((u) => live && setUri(u))
      .catch((err) => logger.warn("meal.detail.photo_failed", { message: errorMessage(err) }));
    return () => {
      live = false;
    };
  }, [mediaId]);
  return uri;
};

/** Logged-meal detail: local time, macros, micros, ingredients, warnings, photo. */
export const MealLogDetailSheet = ({ meal, onClose }: Props) => {
  const photo = useMealPhoto(meal?.mediaId);
  if (!meal) return null;
  const micros = microsOf(meal);
  const ingredients = meal.ingredients ?? [];
  const warnings = meal.warnings ?? [];

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
          style={[sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg"), { maxHeight: "88%" }]}
        >
          <View style={sx("mb-space-sm flex-row items-center justify-between")}>
            <CapsLabel tone="lime">{slotLabelOf(meal)}</CapsLabel>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={sx("h-11 w-11 items-center justify-center")}
            >
              <X size={22} color={color.onSurfaceVariant} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={sx("mb-space-md flex-row items-center gap-space-md")}>
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  accessibilityLabel={`Photo of ${meal.name}`}
                  style={{ width: 72, height: 72, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : null}
              <View style={sx("flex-1")}>
                <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{meal.name}</Text>
                <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
                  {formatLocalDateTime(meal.eatenAt)}
                </Text>
              </View>
            </View>

            <View style={sx("flex-row gap-space-sm")}>
              <MacroCell label="kcal" value={meal.kcal > 0 ? String(meal.kcal) : "—"} />
              <MacroCell label="protein" value={`${Math.round(meal.proteinG)}g`} />
              <MacroCell label="carbs" value={`${Math.round(meal.carbsG)}g`} />
              <MacroCell label="fat" value={`${Math.round(meal.fatG)}g`} />
            </View>

            {micros.length > 0 ? (
              <View style={sx("mt-space-md")}>
                <CapsLabel>Micros</CapsLabel>
                {micros.map((m) => (
                  <View key={m.label} style={sx("flex-row items-center justify-between py-1")}>
                    <Text style={sx("font-body-medium text-body-md text-on-surface")}>{m.label}</Text>
                    <Text style={sx("font-label-bold text-label-md text-on-surface-variant")}>{m.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {ingredients.length > 0 ? (
              <View style={sx("mt-space-md")}>
                <CapsLabel>Ingredients</CapsLabel>
                {ingredients.map((i, idx) => (
                  <View key={`${i.name}-${idx}`} style={sx("flex-row items-center gap-space-sm py-1")}>
                    <Text numberOfLines={2} style={sx("flex-1 font-body-medium text-body-md text-on-surface")}>
                      {i.name}
                    </Text>
                    <Text style={sx("font-label-bold text-label-md text-on-surface-variant")}>
                      {ingredientMeta(i)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {warnings.length > 0 ? (
              <View style={sx("mt-space-md rounded-lg bg-surface-container-high p-space-sm")}>
                <View style={sx("mb-1 flex-row items-center gap-1.5")}>
                  <TriangleAlert size={16} color={color.error} />
                  <CapsLabel tone="alert">Heads up</CapsLabel>
                </View>
                {warnings.map((w) => (
                  <Text key={w} style={sx("mt-1 font-body text-body-sm text-on-surface")}>
                    {w}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
