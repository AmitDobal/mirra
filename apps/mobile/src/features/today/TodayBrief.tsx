import { Text, View } from "react-native";

import { kcalStatus, proteinChip } from "@/lib/accountability";
import type { PersonalInsights } from "@/lib/api";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

/** Today brief: accountability tip first, target-vs-logged chips. */
export const TodayBrief = ({ insights }: { insights: PersonalInsights }) => {
  const { fuel } = insights;
  const kcal = kcalStatus(fuel.kcalLogged, fuel.kcalTarget);
  const over = kcal.over || (fuel.kcalOver ?? 0) > 0;
  const callout = insights.harsh || over;
  const message = callout
    ? (insights.accountabilityTip ?? insights.tips[0] ?? insights.win)
    : (insights.win ?? insights.tips[0]);
  const proteinShort = (fuel.proteinGDelta ?? 0) < 0;

  return (
    <View style={sx("mb-space-md rounded-lg bg-surface-container-high p-space-md")}>
      <View style={sx("flex-row items-center gap-space-sm")}>
        <AiBadge label={false} tone="lime" size={18} />
        <CapsLabel tone={callout ? "alert" : "lime"}>
          {callout ? "Call-out" : "Your Mirra brief"}
        </CapsLabel>
      </View>
      {message ? (
        <Text style={sx("mt-1 font-body-medium text-body-md text-on-surface")}>{message}</Text>
      ) : null}
      <View style={sx("mt-space-sm flex-row flex-wrap gap-2")}>
        <CapsLabel tone={over ? "alert" : "muted"}>{kcal.chip}</CapsLabel>
        <CapsLabel tone={proteinShort && callout ? "alert" : "muted"}>
          {proteinChip(fuel.proteinGLogged, fuel.proteinGTarget)}
        </CapsLabel>
        {insights.checkIn.streakDays > 0 ? (
          <CapsLabel>{insights.checkIn.streakDays}d streak</CapsLabel>
        ) : null}
      </View>
    </View>
  );
};
