import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { s19LogMeal } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { pressFeedback } from "./press-style";

type Props = {
  readonly logged: number;
  readonly target: number;
  readonly left: number;
  readonly over: boolean;
  readonly overBy: number;
  readonly onLog: () => void;
};

/** S15B fuel row: meal photo anchor + kcal line + "+ Log fuel" → existing log-meal flow. */
export const FuelPhotoRow = ({ logged, target, left, over, overBy, onLog }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Log fuel"
    onPress={onLog}
    style={({ pressed }) => [
      sx("flex-row items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm"),
      pressFeedback(pressed),
    ]}
  >
    <Image
      source={s19LogMeal.mealFlankSteak}
      accessibilityLabel="Meal photo"
      style={styles.thumb}
      resizeMode="cover"
    />
    <View style={sx("min-w-0 flex-1")}>
      <Text style={sx("font-headline-semi text-body-lg text-on-surface")} numberOfLines={1}>
        Fuel · {logged} / {target || "—"} kcal
      </Text>
      <Text
        style={sx(`font-body text-body-sm ${over ? "text-error" : "text-on-surface-variant"}`)}
        numberOfLines={1}
      >
        {over ? `Over by ${overBy} kcal` : `${left} kcal left`}
      </Text>
    </View>
    <View style={sx("rounded-full bg-primary-fixed px-3 py-1.5")}>
      <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>+ Log fuel</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
  },
});
