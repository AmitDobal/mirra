import {
  Image,
  Text,
  View,
  type ImageStyle,
} from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { sx } from "@/theme/sx";

import { useOnboardingImagery } from "../imagery";

/** Rounded athlete tile (ImageStyle ≠ sx View/Text). */
const imageStyle: ImageStyle = {
  width: 96,
  height: 96,
  borderRadius: 16,
};

/** S13 hero — Stitch hard-paywall layout; coach image from gendered imagery helper. */
export const PaywallHero = () => {
  const c = onboardingCopy.paywall;
  const { paywallCoach } = useOnboardingImagery();

  return (
    <View
      style={sx(
        "flex-row items-center gap-space-sm overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low p-space-md",
      )}
    >
      <View style={sx("min-w-0 flex-1")}>
        <Text style={sx("mb-1.5 font-headline-semi text-[21px] leading-tight text-primary")}>
          {c.title}
        </Text>
        <Text style={sx("font-body text-[12px] leading-relaxed text-on-surface-variant")}>
          {c.subtitle}
        </Text>
      </View>
      <Image
        source={paywallCoach}
        accessibilityLabel="Mirra coach"
        resizeMode="cover"
        style={imageStyle}
      />
    </View>
  );
};
