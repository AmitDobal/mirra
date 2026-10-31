import { Columns3, MonitorCheck, Workflow } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type BenefitId = (typeof onboardingCopy.paywall.benefits)[number]["id"];

const ICON_SIZE = 20;

/** Circle bg + glyph per S13 row (secondary-container / surface-high). */
const iconByBenefit: Record<BenefitId, { circle: string; glyph: ReactNode }> = {
  checkins: {
    circle: "bg-secondary-container",
    glyph: <MonitorCheck color={color.secondary} size={ICON_SIZE} />,
  },
  rebuild: {
    circle: "bg-surface-container-high",
    glyph: <Workflow color={color.primaryContainer} size={ICON_SIZE} />,
  },
  weeks: {
    circle: "bg-surface-container-high",
    glyph: <Columns3 color={color.secondary} size={ICON_SIZE} />,
  },
};

const pillStyle = {
  Auto: "bg-secondary",
  Smart: "bg-primary-container",
} as const;

const pillText = {
  Auto: "text-on-secondary",
  Smart: "text-on-primary-fixed",
} as const;

/** S13 three feature rows — circular icon, title, optional Auto/Smart pill. */
export const PaywallFeatureList = () => (
  <View style={sx("gap-space-sm")}>
    {onboardingCopy.paywall.benefits.map((b) => {
      const { circle, glyph } = iconByBenefit[b.id];
      return (
        <View
          key={b.id}
          style={sx("flex-row items-center gap-space-md rounded-20 bg-surface-container-low p-space-md")}
        >
          <View
            style={sx(`h-9 w-9 shrink-0 items-center justify-center rounded-full ${circle}`)}
          >
            {glyph}
          </View>
          <View style={sx("flex-1")}>
            <View style={sx("flex-row items-center gap-space-sm")}>
              <Text style={sx("font-headline-semi text-headline-sm text-primary")}>
                {b.title}
              </Text>
              {b.pill ? (
                <View
                  style={sx(`rounded-full px-space-sm py-space-xs ${pillStyle[b.pill]}`)}
                >
                  <Text style={sx(`font-label-bold text-label-md ${pillText[b.pill]}`)}>
                    {b.pill}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={sx("font-body text-body-sm text-on-surface-variant")}
            >
              {b.sub}
            </Text>
          </View>
        </View>
      );
    })}
  </View>
);
