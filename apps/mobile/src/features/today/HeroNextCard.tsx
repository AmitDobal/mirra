import { ChevronRight } from "lucide-react-native";
import { Text, View } from "react-native";

import type { AccountabilityScenario, GoalTone, NextAction } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

const TONE_COLOR: Record<GoalTone, string> = {
  alert: color.error,
  warn: color.tertiaryFixedDim,
  good: color.primaryFixed,
};

const SCENARIO_LABEL: Record<AccountabilityScenario, string> = {
  OVER_KCAL: "Over target",
  UNDER_PROTEIN: "Protein short",
  MISSED_LIFT: "Missed lift",
  UNDER_EATING: "Under-fuelled",
  ON_TRACK: "On track",
  STREAK_BREAK: "Streak at risk",
  LOW_READINESS: "Low readiness",
};

type Props = {
  readonly next: NextAction | null;
  readonly scenario: AccountabilityScenario;
  readonly onPress: (next: NextAction) => void;
};

/** Today hero: scenario eyebrow, next goal, one reason line, one CTA. */
export const HeroNextCard = ({ next, scenario, onPress }: Props) => {
  const tone = next?.tone ?? "good";
  const tint = TONE_COLOR[tone];
  return (
    <View
      style={sx("mb-space-md overflow-hidden rounded-lg bg-surface-container-high p-space-md")}
    >
      <View style={sx("mb-space-sm flex-row items-center gap-space-sm")}>
        <View style={[sx("h-2 w-2 rounded-full"), { backgroundColor: tint }]} />
        <CapsLabel tone={tone === "alert" ? "alert" : tone === "good" ? "lime" : "muted"}>
          {next ? SCENARIO_LABEL[scenario] : "All done"}
        </CapsLabel>
      </View>
      <Text style={sx("font-headline text-headline-md text-on-surface")} numberOfLines={2}>
        {next?.title ?? "Today is handled"}
      </Text>
      <Text style={sx("mt-1 font-body text-body-md text-on-surface-variant")} numberOfLines={3}>
        {next?.reason ?? "Every goal is done. Recover well."}
      </Text>
      {next ? (
        <LimeCta
          label={next.ctaLabel}
          onPress={() => onPress(next)}
          style={sx("mt-space-md")}
          icon={<ChevronRight size={18} color={color.onPrimaryFixed} />}
        />
      ) : null}
    </View>
  );
};
