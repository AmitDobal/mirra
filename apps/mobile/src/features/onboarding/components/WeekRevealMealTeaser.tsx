import { Utensils } from "lucide-react-native";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly dietLabels: readonly string[];
  readonly cuisineLabels: readonly string[];
  readonly avoidLabel: string | null;
};

/** Static teaser — no meal-plan generate. Chips from onboarding store only. */
export const WeekRevealMealTeaser = ({
  dietLabels,
  cuisineLabels,
  avoidLabel,
}: Props) => {
  const c = onboardingCopy.weekReveal.mealTeaser;
  const chips = [...dietLabels, ...cuisineLabels].slice(0, 6);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={`${c.title}. ${c.sub}`}
      style={sx(
        "mt-space-lg overflow-hidden rounded-[24px] border border-primary-fixed/35 bg-surface-container-high p-space-md",
      )}
    >
      <View style={sx("mb-space-sm flex-row items-center gap-space-sm")}>
        <View
          style={sx(
            "h-10 w-10 items-center justify-center rounded-full bg-primary-fixed",
          )}
        >
          <Utensils color={color.onPrimaryFixed} size={18} />
        </View>
        <View style={sx("flex-1")}>
          <Text style={sx("font-label-bold text-label-caps uppercase text-secondary")}>
            {c.eyebrow}
          </Text>
          <Text style={sx("font-headline-semi text-headline-sm text-on-surface")}>
            {c.title}
          </Text>
        </View>
      </View>

      <Text style={sx("mb-space-sm font-body text-body-md text-on-surface-variant")}>
        {c.sub}
      </Text>

      {chips.length > 0 ? (
        <View style={sx("mb-space-sm flex-row flex-wrap gap-2")}>
          {chips.map((label) => (
            <View
              key={label}
              style={sx(
                "rounded-full border border-outline-variant/50 bg-surface-container px-space-md py-1.5",
              )}
            >
              <Text style={sx("font-label text-label-md text-on-surface")}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {avoidLabel ? (
        <Text style={sx("mb-space-sm font-body text-body-sm text-on-surface-variant")}>
          {c.avoidPrefix} {avoidLabel}
        </Text>
      ) : null}

      <Text style={sx("font-body-medium text-body-sm text-primary-container")}>
        {c.homeHint}
      </Text>
    </View>
  );
};
