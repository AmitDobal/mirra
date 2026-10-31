import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { CUISINE_OPTIONS } from "@/content/cuisines";
import { getMyFoodPrefs, patchFoodPrefs, type FoodPrefs } from "@/lib/api";
import { errorMessage, logger } from "@/lib/logger";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { Chip } from "@/ui/Chip";
import { LimeCta } from "@/ui/LimeCta";

import {
  AVOID_OPTIONS,
  buildFoodPrefs,
  currentDiet,
  DIET_OPTIONS,
  selectedAvoid,
  type DietChoice,
} from "./diet-prefs";

type Props = {
  readonly visible: boolean;
  readonly onClose: () => void;
  /** Called after a successful save with the stored prefs. */
  readonly onSaved: (prefs: FoodPrefs) => void;
};

/** Bottom sheet: diet + foods to avoid → PATCH /v1/me/preferences. */
export const DietPrefsSheet = ({ visible, onClose, onSaved }: Props) => {
  const [prev, setPrev] = useState<FoodPrefs | null>(null);
  const [diet, setDiet] = useState<DietChoice | null>(null);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMyFoodPrefs()
      .then((prefs) => {
        if (cancelled) return;
        setPrev(prefs);
        setDiet(currentDiet(prefs?.dietTags ?? []));
        setAvoid(selectedAvoid(prefs?.foodsAvoid ?? null));
        setCuisines([...(prefs?.cuisineStyles ?? [])]);
      })
      .catch((err: unknown) => {
        logger.warn("diet_prefs.load_failed", { message: errorMessage(err) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleToggleAvoid = (word: string) =>
    setAvoid((list) => (list.includes(word) ? list.filter((w) => w !== word) : [...list, word]));

  const handleToggleCuisine = (id: string) =>
    setCuisines((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));

  const canSave = Boolean(diet) && cuisines.length > 0 && !loading;

  const handleSave = async () => {
    if (!diet || cuisines.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await patchFoodPrefs(buildFoodPrefs(prev, diet, avoid, cuisines));
      onSaved(res.preferences);
    } catch (err) {
      logger.warn("diet_prefs.save_failed", { message: errorMessage(err) });
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss food prefs"
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg")}
        >
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>Food prefs</Text>
          <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
            Meal plans only use foods that fit.
          </Text>

          {loading ? (
            <ActivityIndicator color={color.primaryFixed} style={sx("my-space-md")} />
          ) : (
            <>
              <CapsLabel style={sx("mb-space-xs mt-space-md")}>How you eat</CapsLabel>
              <View style={sx("flex-row flex-wrap gap-space-sm")}>
                {DIET_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    selected={diet === o.id}
                    onPress={() => setDiet(o.id)}
                  />
                ))}
              </View>

              <CapsLabel style={sx("mb-space-xs mt-space-md")}>Cuisines (pick at least one)</CapsLabel>
              <View style={sx("flex-row flex-wrap gap-space-sm")}>
                {CUISINE_OPTIONS.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    selected={cuisines.includes(o.id)}
                    onPress={() => handleToggleCuisine(o.id)}
                  />
                ))}
              </View>

              <CapsLabel style={sx("mb-space-xs mt-space-md")}>Avoid (optional)</CapsLabel>
              <View style={sx("flex-row flex-wrap gap-space-sm")}>
                {AVOID_OPTIONS.map((word) => (
                  <Chip
                    key={word}
                    label={word.charAt(0).toUpperCase() + word.slice(1)}
                    selected={avoid.includes(word)}
                    onPress={() => handleToggleAvoid(word)}
                  />
                ))}
              </View>
            </>
          )}

          {error ? <CapsLabel tone="alert" style={sx("mt-space-sm")}>{error}</CapsLabel> : null}

          <LimeCta
            label={saving ? "Saving…" : "Save"}
            onPress={() => void handleSave()}
            style={sx(`mt-space-md ${canSave ? "" : "opacity-40"}`)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
