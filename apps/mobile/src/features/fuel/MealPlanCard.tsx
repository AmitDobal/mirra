import { Check, ChefHat, ChevronDown, Repeat2, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { PlannedItem, PlannedMeal } from "@/lib/api";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { formatPortion } from "./portion";

const MAX_ITEMS = 3;
const CTA_HEIGHT = 44;
const divider = { borderTopWidth: 1, borderTopColor: color.outlineVariant } as const;

/** One-line portion row: name · portion · lime grams. */
const ItemRow = ({ item }: { readonly item: PlannedItem }) => (
  <View style={sx("flex-row items-center gap-space-sm py-1")}>
    <Text numberOfLines={1} style={sx("flex-1 font-body-medium text-body-md text-on-surface")}>
      {item.name}
    </Text>
    <Text numberOfLines={1} style={sx("font-label-bold text-label-md text-on-surface-variant")}>
      {formatPortion(item)}
    </Text>
    <Text
      style={[
        sx("text-right font-label-bold text-label-md text-primary-fixed-dim"),
        { minWidth: 44 },
      ]}
    >
      {Math.round(item.grams)} g
    </Text>
  </View>
);

type PlannedCardProps = {
  readonly meal: PlannedMeal;
  readonly busy: boolean;
  readonly onLog: (meal: PlannedMeal) => void;
  readonly onSwap: (meal: PlannedMeal) => void;
  readonly onDelete: (meal: PlannedMeal) => void;
  /** Open the meal detail sheet (row tap). */
  readonly onOpen: (meal: PlannedMeal) => void;
  /** Open the detail sheet straight into Chef chat. */
  readonly onChef: (meal: PlannedMeal) => void;
};

/** Open meal: compact row (slot+protein chip · title · kcal). Row tap → detail sheet; chevron → quick actions. */
export const PlannedCard = ({ meal, busy, onLog, onSwap, onDelete, onOpen, onChef }: PlannedCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const shown = meal.items.slice(0, MAX_ITEMS);
  const extra = meal.items.length - shown.length;

  return (
    <View
      style={sx(
        "mb-space-sm overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high",
      )}
    >
      <View style={sx("flex-row items-center")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${meal.title}, ${meal.kcal} kcal. Open details`}
          onPress={() => onOpen(meal)}
          style={({ pressed }) => [
            sx("flex-1 flex-row items-center gap-space-sm py-space-sm pl-space-md"),
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={sx("rounded-full bg-primary-fixed px-space-sm py-1")}>
            <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>
              {meal.slot} · {Math.round(meal.proteinG)}P
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={sx("flex-1 font-headline-semi text-body-lg text-on-surface")}
          >
            {meal.title}
          </Text>
          <Text style={sx("font-label-bold text-label-lg text-on-surface")}>
            {meal.fit === "approx" ? "~" : ""}
            {meal.kcal}
            <Text style={sx("text-label-md text-on-surface-variant")}> kcal</Text>
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${meal.title}`}
          onPress={() => setExpanded((v) => !v)}
          style={sx("h-11 w-11 items-center justify-center")}
        >
          <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
            <ChevronDown size={18} color={color.onSurfaceVariant} />
          </View>
        </Pressable>
      </View>

      {expanded ? (
        <View style={sx("px-space-md pb-space-md")}>
          <View style={[sx("pt-space-xs"), divider]}>
            {shown.map((item) => (
              <ItemRow key={item.foodId} item={item} />
            ))}
            {extra > 0 ? <CapsLabel>+{extra} more</CapsLabel> : null}
          </View>
          <View
            pointerEvents={busy ? "none" : "auto"}
            style={[sx("mt-space-sm flex-row gap-space-sm"), { opacity: busy ? 0.5 : 1 }]}
          >
            <LimeCta
              label="Log"
              accessibilityLabel={`Log ${meal.title}`}
              onPress={() => onLog(meal)}
              icon={<Check size={16} color={color.onPrimaryFixed} />}
              style={{ flex: 1.5, height: CTA_HEIGHT }}
            />
            <LimeCta
              label="Chef"
              accessibilityLabel={`Ask Chef about ${meal.title}`}
              onPress={() => onChef(meal)}
              variant="dark"
              icon={<ChefHat size={16} color={color.onSurface} />}
              style={{ flex: 1, height: CTA_HEIGHT, paddingHorizontal: 0 }}
            />
            <LimeCta
              label="Swap"
              accessibilityLabel={`Swap ${meal.title}`}
              onPress={() => onSwap(meal)}
              variant="dark"
              icon={<Repeat2 size={16} color={color.onSurface} />}
              style={{ flex: 1, height: CTA_HEIGHT, paddingHorizontal: 0 }}
            />
            <LimeCta
              label="Delete"
              accessibilityLabel={`Delete ${meal.title}`}
              onPress={() => onDelete(meal)}
              variant="dark"
              icon={<Trash2 size={16} color={color.onSurface} />}
              style={{ flex: 1, height: CTA_HEIGHT, paddingHorizontal: 0 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

/** Logged / skipped meal — compact, still legible. */
export const LoggedRow = ({ meal }: { readonly meal: PlannedMeal }) => {
  const logged = meal.status === "logged";
  return (
    <View
      accessibilityLabel={`${meal.title} ${meal.status}`}
      style={[
        sx(
          "mb-space-sm flex-row items-center gap-space-md rounded-lg border border-outline-variant bg-surface-container-low p-space-md",
        ),
        { opacity: logged ? 1 : 0.6 },
      ]}
    >
      <View
        style={sx(`h-8 w-8 items-center justify-center rounded-full ${
          logged ? "bg-primary-fixed" : "bg-surface-container-highest"
        }`)}
      >
        {logged ? <Check size={18} color={color.onPrimaryFixed} strokeWidth={3} /> : null}
      </View>
      <View style={sx("flex-1")}>
        <CapsLabel tone={logged ? "lime" : "muted"}>{meal.slot}</CapsLabel>
        <Text numberOfLines={1} style={sx("font-headline-semi text-body-lg text-on-surface")}>
          {meal.title}
        </Text>
      </View>
      <Text style={sx("font-label-bold text-label-lg text-on-surface-variant")}>
        {logged ? `${meal.kcal} kcal` : "Skipped"}
      </Text>
    </View>
  );
};
