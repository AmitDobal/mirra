import { Check } from "lucide-react-native";
import { Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

/** S13 hard paywall — five Pro pillars with lime check marks. */
export const PaywallFeatureList = () => (
  <View
    style={sx(
      "gap-space-sm rounded-2xl border border-outline-variant/20 bg-surface-container-low p-3.5",
    )}
  >
    {onboardingCopy.paywall.benefits.map((b) => (
      <View key={b.id} style={sx("flex-row items-start gap-2.5")}>
        <View
          style={sx(
            "mt-0.5 h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-container",
          )}
        >
          <Check color={color.onPrimaryFixed} size={14} strokeWidth={3} />
        </View>
        <View style={sx("min-w-0 flex-1")}>
          <Text style={sx("font-headline-semi text-[13px] leading-4 text-primary")}>
            {b.title}
          </Text>
          <Text style={sx("font-body text-[11px] leading-snug text-on-surface-variant")}>
            {b.sub}
          </Text>
        </View>
      </View>
    ))}
  </View>
);
