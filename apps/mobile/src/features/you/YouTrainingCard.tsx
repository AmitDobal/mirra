import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import type { LocalPlan } from "@/db";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

import { Divider, Group, Row } from "./you-settings";

const LOCATIONS = [
  { id: "gym", label: "Primary kit" },
  { id: "home", label: "Home" },
  { id: "hotel", label: "Hotel" },
] as const;

type Props = {
  readonly plan: LocalPlan | null;
  readonly locationId: string;
  readonly onLocation: (id: string) => void;
  readonly onFoodPrefs: () => void;
};

/** Active plan + locations + food prefs row. */
export const YouTrainingCard = ({ plan, locationId, onLocation, onFoodPrefs }: Props) => {
  const protocolTitle = plan?.days.find((d) => d.workout)?.workout?.title ?? "No active plan";
  const protocolBody =
    plan?.summary.outcomeLine ||
    (plan
      ? `${plan.summary.kcalTarget} kcal · ${plan.summary.proteinG}g protein`
      : "Generate a plan to calibrate volume.");

  return (
    <Group title="Active training">
      <View style={sx("p-space-md")}>
        <CapsLabel>Active plan</CapsLabel>
        <Text style={sx("mt-1 font-label text-label-md text-primary-fixed")}>
          Week of {plan?.weekStart ?? "—"}
        </Text>
        <Text style={sx("mt-space-sm font-headline-sm text-headline-sm text-on-surface")}>
          {protocolTitle}
        </Text>
        <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>{protocolBody}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open coach check-in"
          onPress={() => router.push("/(tabs)/coach")}
          style={sx("mt-space-sm self-start")}
        >
          <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>Open coach →</Text>
        </Pressable>
      </View>
      <Divider />
      <View style={sx("px-space-md py-space-sm")}>
        <CapsLabel style={sx("mb-space-sm")}>Training locations</CapsLabel>
        <View style={sx("flex-row flex-wrap gap-space-sm")}>
          {LOCATIONS.map((loc) => {
            const active = locationId === loc.id;
            return (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onLocation(loc.id)}
                style={sx(
                  `rounded-full px-3 py-2 ${
                    active ? "bg-primary-fixed" : "bg-surface-container-highest"
                  }`,
                )}
              >
                <Text
                  numberOfLines={1}
                  style={sx(
                    `font-label text-[11px] leading-4 ${
                      active ? "text-on-primary-fixed" : "text-on-surface"
                    }`,
                  )}
                >
                  {loc.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Divider />
      <Row title="Food prefs" meta="Diet, cuisines & foods to avoid" onPress={onFoodPrefs} />
    </Group>
  );
};
