import { overKcalTip } from "@/lib/accountability";
import type { Meal, MealAnalysisFields, MealSlot } from "@/lib/api";

import type { LocalMeal } from "./fuel-store";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const slotKey = (slot: string): MealSlot => {
  const s = slot.toLowerCase();
  if (s === "breakfast" || s === "lunch" || s === "dinner" || s === "snack") {
    return s;
  }
  return "snack";
};

/** Blobs from file:// URIs often have no type → force a real image mime so the vision API accepts it. */
const withImageMime = (dataUrl: string, mime: string | null): string => {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return dataUrl;
  const type = mime && mime.startsWith("image/") ? mime : "image/jpeg";
  return `data:${type};base64,${dataUrl.slice(comma + 1)}`;
};

export const uriToDataUrl = async (uri: string, mime: string | null = null): Promise<string> => {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(withImageMime(result, mime));
      else reject(new Error("Invalid image data"));
    };
    reader.readAsDataURL(blob);
  });
};

export const tipAfterLog = (
  target: number,
  proteinTarget: number | null,
  meals: readonly LocalMeal[],
): string | null => {
  const kcal = meals.reduce((s, m) => s + m.calories, 0);
  const protein = meals.reduce((s, m) => s + m.proteinG, 0);
  const left = Math.max(0, target - kcal);
  if (target > 0 && kcal > target) return overKcalTip(kcal - target);
  if (proteinTarget != null && protein < proteinTarget * 0.5) {
    return `Logged. Still need ~${Math.round(proteinTarget - protein)}g protein today.`;
  }
  if (left > target * 0.45) {
    return `Nice. ~${left} kcal remaining — leave room for a solid dinner.`;
  }
  if (left < 200 && left > 0) {
    return `Close to target — ${left} kcal left. Soft landing.`;
  }
  return "Meal saved. Mirra adjusted your remaining fuel.";
};

/** Local-only `Meal` (offline fallback / optimistic save) so detail can render the same shape as the API. */
export const buildLocalMeal = (m: {
  id: string;
  name: string;
  slot: string;
  kcal: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  eatenAt: number;
  mediaId?: string | null;
  analysis?: MealAnalysisFields;
}): Meal => ({
  id: m.id,
  name: m.name,
  mealSlot: slotKey(m.slot),
  kcal: m.kcal,
  proteinG: m.proteinG,
  carbsG: m.carbsG ?? 0,
  fatG: m.fatG ?? 0,
  eatenAt: m.eatenAt,
  mediaId: m.mediaId ?? null,
  createdAt: m.eatenAt,
  ...m.analysis,
});
