import {
  Apple,
  Beef,
  Citrus,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  Leaf,
  Milk,
  Pencil,
  Plus,
  Utensils,
  Wheat,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { color, font, radius, space } from "@/theme/tokens";

import type { SnapIngredient } from "./snap-model";

type IconType = ComponentType<{ size?: number; color?: string }>;

const ICONS: readonly (readonly [RegExp, IconType])[] = [
  [/chicken|turkey|poultry/i, Drumstick],
  [/steak|beef|pork|lamb|meat|bacon|sausage/i, Beef],
  [/fish|salmon|tuna|shrimp|prawn/i, Fish],
  [/egg/i, Egg],
  [/rice|pasta|noodle|bread|oat|quinoa|wheat|grain|tortilla|potato/i, Wheat],
  [/oil|butter|sauce|dressing|glaze|mayo/i, Droplet],
  [/milk|yogurt|yoghurt|cheese|cream/i, Milk],
  [/avocado|lime|lemon|orange|fruit|berry/i, Citrus],
  [/apple|banana|mango/i, Apple],
  [/broccoli|salad|lettuce|spinach|kale|vegetable|greens|pepper|tomato/i, Leaf],
];

const iconFor = (name: string): IconType => ICONS.find(([re]) => re.test(name))?.[1] ?? Utensils;

const detail = (i: SnapIngredient): string => {
  const parts = [`${Math.round(i.kcal)} kcal`];
  if (i.proteinG >= 1) parts.push(`${Math.round(i.proteinG)}g P`);
  if (i.carbsG >= 1) parts.push(`${Math.round(i.carbsG)}g C`);
  if (i.fatG >= 1) parts.push(`${Math.round(i.fatG)}g F`);
  return parts.join(" · ");
};

type Props = {
  readonly ingredients: readonly SnapIngredient[];
  readonly onEdit: (id: string | null) => void;
  readonly onAdd: () => void;
};

/** "Ingredients detected" list: tap a row to adjust grams. */
export const IngredientRows = ({ ingredients, onEdit, onAdd }: Props) => (
  <View style={styles.wrap}>
    <View style={styles.head}>
      <Text style={styles.title}>Ingredients Detected</Text>
      {ingredients.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => onEdit(null)} hitSlop={8}>
          <Text style={styles.editAll}>Edit All</Text>
        </Pressable>
      ) : null}
    </View>
    <Text style={styles.hint}>
      {ingredients.length > 0
        ? "Tap any row to adjust grams"
        : "No ingredients were itemised. Add what's on the plate."}
    </Text>

    {ingredients.map((i) => {
      const Icon = iconFor(i.name);
      return (
        <Pressable
          key={i.id}
          accessibilityRole="button"
          accessibilityLabel={`${i.name}, ${i.grams ?? "unknown"} grams. Adjust portion`}
          onPress={() => onEdit(i.id)}
          style={styles.row}
        >
          <View style={styles.icon}>
            <Icon size={18} color={color.primaryFixed} />
          </View>
          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>
              {i.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {detail(i)}
            </Text>
          </View>
          <View style={styles.gramPill}>
            <Text style={styles.grams}>{i.grams !== null ? `${i.grams}g` : "—"}</Text>
          </View>
          <Pencil size={14} color={color.onSurfaceVariant} />
        </Pressable>
      );
    })}

    <Pressable accessibilityRole="button" onPress={onAdd} style={styles.add}>
      <Plus size={14} color={color.onSurfaceVariant} />
      <Text style={styles.addText}>Add missing ingredient</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: font.headline, fontSize: 18, color: color.onSurface },
  editAll: { fontFamily: font.labelBold, fontSize: 13, color: color.primaryFixed },
  hint: {
    fontFamily: font.body,
    fontSize: 12,
    color: color.onSurfaceVariant,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.outlineVariant,
    backgroundColor: color.surfaceContainerLow,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    marginBottom: space.sm,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.surfaceContainerHigh,
  },
  body: { flex: 1 },
  name: { fontFamily: font.bodySemi, fontSize: 14, color: color.onSurface },
  meta: { fontFamily: font.body, fontSize: 11, color: color.onSurfaceVariant, marginTop: 1 },
  gramPill: {
    borderRadius: radius.full,
    backgroundColor: color.surfaceContainerHighest,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  grams: { fontFamily: font.label, fontSize: 13, color: color.onSurface },
  add: {
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.outlineVariant,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addText: { fontFamily: font.bodyMedium, fontSize: 13, color: color.onSurfaceVariant },
});
