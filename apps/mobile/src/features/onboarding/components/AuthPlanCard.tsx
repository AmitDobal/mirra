import { CircleCheck } from "lucide-react-native";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type AuthPlanCardProps = {
  title: string;
  sessionsPerWeek: number;
  kcalTarget?: number | null;
};

/** S14 lavender plan snapshot (secondary surface, on-secondary text). */
export const AuthPlanCard = ({
  title,
  sessionsPerWeek,
  kcalTarget,
}: AuthPlanCardProps) => {
  const c = onboardingCopy.auth;

  return (
    <View
      accessibilityRole="summary"
      style={sx(
        "flex-row items-center justify-between gap-space-md rounded-20 bg-secondary p-space-md",
      )}
    >
      <View style={sx("flex-1 flex-row items-center gap-space-md")}>
        <View
          style={sx("h-9 w-9 shrink-0 items-center justify-center rounded-full bg-on-secondary")}
        >
          <CircleCheck color={color.primaryFixed} size={20} />
        </View>
        <View style={sx("flex-1")}>
          <Text
            numberOfLines={1}
            style={sx("font-label-bold text-label-lg text-on-secondary")}
          >
            {title}
          </Text>
          <View style={sx("flex-row items-center gap-space-sm")}>
            <Text style={sx("font-body text-body-sm text-on-secondary/80")}>
              {`${sessionsPerWeek}× ${c.perWeek}`}
            </Text>
            {kcalTarget ? (
              <>
                <Text style={sx("font-body text-body-sm text-on-secondary/80")}>•</Text>
                <Text style={sx("font-body-semi text-body-sm text-on-secondary")}>
                  {`${kcalTarget.toLocaleString("en-US")} ${c.kcal}`}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
      <View style={sx("shrink-0 rounded-full bg-surface/10 px-space-sm py-space-xs")}>
        <Text style={sx("font-label-bold text-label-caps uppercase text-on-secondary")}>
          {c.active}
        </Text>
      </View>
    </View>
  );
};
