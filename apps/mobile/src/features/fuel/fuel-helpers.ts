import { overKcalTip } from "@/lib/accountability";
import type { MealSlot } from "@/lib/api";

import type { LocalMeal } from "./fuel-store";

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const formatTime = (ms?: number) =>
  new Date(ms ?? Date.now()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export const slotKey = (slot: string): MealSlot => {
  const s = slot.toLowerCase();
  if (s === "breakfast" || s === "lunch" || s === "dinner" || s === "snack") {
    return s;
  }
  return "snack";
};

export const uriToDataUrl = async (uri: string): Promise<string> => {
  const res = await fetch(uri);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
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
