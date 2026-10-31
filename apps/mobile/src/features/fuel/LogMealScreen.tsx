import { router } from "expo-router";
import { Camera, CheckCircle2, X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";

import { s19LogMeal } from "../../../assets/stitch";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { useFuelStore } from "./fuel-store";
import { promptRebalanceIfOffPlan } from "./rebalance-prompt";
import { sx } from "@/theme/sx";

const slots = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

const ADDS = [
  { name: "Whey Shake", calories: 120, proteinG: 25, meta: "25g P" },
  { name: "2 Large Eggs", calories: 140, proteinG: 12, meta: "12g P" },
  { name: "Greek Yogurt", calories: 150, proteinG: 18, meta: "18g P" },
] as const;

/** S19 Log meal — SQLite + API write-through. */
export const LogMealScreen = () => {
  const [slot, setSlot] = useState<(typeof slots)[number]>("Breakfast");
  const [name, setName] = useState("Manual meal");
  const [baseKcal, setBaseKcal] = useState("400");
  const [baseProtein, setBaseProtein] = useState("30");
  const [extras, setExtras] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const addMeal = useFuelStore((s) => s.addMeal);

  const extraCals = extras.reduce(
    (sum, n) => sum + (ADDS.find((a) => a.name === n)?.calories ?? 0),
    0,
  );
  const extraP = extras.reduce(
    (sum, n) => sum + (ADDS.find((a) => a.name === n)?.proteinG ?? 0),
    0,
  );
  const kcal = (Number(baseKcal) || 0) + extraCals;
  const protein = (Number(baseProtein) || 0) + extraP;
  const carbs = Math.max(0, Math.round((kcal - protein * 4) * 0.55 / 4));
  const fats = Math.max(0, Math.round((kcal - protein * 4 - carbs * 4) / 9));

  const handleClose = () => router.back();
  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const meal = await addMeal({
      name: extras.length ? `${name} + adds` : name,
      calories: kcal,
      proteinG: protein,
      carbsG: carbs,
      fatG: fats,
      slot,
      source: "manual",
    });
    setSaving(false);
    router.back();
    void promptRebalanceIfOffPlan(meal.calories);
  };

  const toggleAdd = (n: string) => {
    setExtras((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  return (
    <ScreenScroll dockPad={false}>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={handleClose}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <X size={22} color={color.onSurface} />
        </Pressable>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>Log meal</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={() => void handleSave()}
        >
          <Text style={sx("font-label-bold text-label-lg text-primary-fixed")}>
            {saving ? "…" : "Save"}
          </Text>
        </Pressable>
      </View>

      <View style={sx("mb-space-md flex-row gap-space-xs")}>
        {slots.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityState={{ selected: slot === s }}
            onPress={() => setSlot(s)}
            style={sx(`flex-1 items-center rounded-full py-2 ${
              slot === s ? "bg-primary-fixed" : "bg-surface-container-high"
            }`)}
          >
            <Text
              style={sx(`font-label text-label-md ${
                slot === s ? "text-on-primary-fixed" : "text-on-surface-variant"
              }`)}
            >
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={sx("mb-space-md items-center rounded-lg bg-surface-container-low p-space-lg")}>
        <CapsLabel tone="lime">Manual entry</CapsLabel>
        <View style={sx("h-36 w-full overflow-hidden rounded-lg bg-surface-container-highest")}>
          <Image
            source={s19LogMeal.mealFlankSteak}
            accessibilityLabel="Meal preview"
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
          <View style={sx("absolute inset-0 items-center justify-center bg-black/25")}>
            <Camera size={32} color={color.onSurface} />
            <Text style={sx("mt-2 font-body text-body-sm text-on-surface")}>
              Optional photo · snap from Fuel
            </Text>
          </View>
        </View>
      </View>

      <TextInput
        accessibilityLabel="Meal name"
        value={name}
        onChangeText={setName}
        style={sx("mb-space-sm rounded-lg bg-surface-container-high px-space-md py-space-sm font-headline-sm text-headline-sm text-on-surface")}
        placeholderTextColor={color.onSurfaceVariant}
        placeholder="Meal name"
      />
      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <TextInput
          accessibilityLabel="Calories"
          value={baseKcal}
          onChangeText={setBaseKcal}
          keyboardType="number-pad"
          style={sx("flex-1 rounded-lg bg-surface-container-high px-space-md py-space-sm font-display text-headline-md text-on-surface")}
          placeholder="kcal"
          placeholderTextColor={color.onSurfaceVariant}
        />
        <TextInput
          accessibilityLabel="Protein grams"
          value={baseProtein}
          onChangeText={setBaseProtein}
          keyboardType="number-pad"
          style={sx("flex-1 rounded-lg bg-surface-container-high px-space-md py-space-sm font-display text-headline-md text-on-surface")}
          placeholder="protein g"
          placeholderTextColor={color.onSurfaceVariant}
        />
      </View>

      <View style={sx("mb-space-md mt-space-sm flex-row items-baseline gap-space-sm")}>
        <Text style={sx("font-display text-display-lg text-on-surface")}>{kcal}</Text>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface-variant")}>kcal</Text>
      </View>

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        {[
          { name: "Protein", g: protein },
          { name: "Carbs", g: carbs },
          { name: "Fats", g: fats },
        ].map((mac) => (
          <View key={mac.name} style={sx("flex-1 rounded-lg bg-surface-container-high p-space-md")}>
            <CapsLabel>{mac.name}</CapsLabel>
            <Text style={sx("mt-1 font-headline text-headline-md text-on-surface")}>{mac.g}g</Text>
          </View>
        ))}
      </View>

      <CapsLabel style={sx("mb-space-sm")}>Quick Micro-Adds</CapsLabel>
      {ADDS.map((a) => {
        const on = extras.includes(a.name);
        return (
          <Pressable
            key={a.name}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => toggleAdd(a.name)}
            style={sx(`mb-space-xs flex-row items-center justify-between rounded-lg px-space-md py-space-sm ${
              on ? "bg-primary-fixed/20" : "bg-surface-container-low"
            }`)}
          >
            <Text style={sx("font-body-medium text-body-md text-on-surface")}>{a.name}</Text>
            <Text style={sx("font-label text-label-md text-primary-fixed")}>
              {on ? "Added" : a.meta}
            </Text>
          </Pressable>
        );
      })}

      <LimeCta
        label={saving ? "Saving…" : "Save meal"}
        onPress={() => void handleSave()}
        style={sx("mt-space-md")}
        icon={<CheckCircle2 size={20} color={color.onPrimaryFixed} />}
      />
    </ScreenScroll>
  );
};
