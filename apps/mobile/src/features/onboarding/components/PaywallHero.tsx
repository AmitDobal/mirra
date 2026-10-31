import { Image, Text, View, type ImageStyle } from "react-native";

import { s13Paywall } from "../../../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { sx } from "@/theme/sx";

/** Right-anchored coach image (ImageStyle ≠ sx's View/Text style type). */
const imageStyle: ImageStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: 112,
  opacity: 0.9,
};

/** S13 hero — headline + subtitle left, coach image bleeding off the right edge. */
export const PaywallHero = () => {
  const c = onboardingCopy.paywall;

  return (
    <View style={sx("min-h-36 overflow-hidden rounded bg-surface-container-low p-space-md")}>
      <View style={{ maxWidth: "66%" }}>
        <Text style={sx("font-headline-semi text-headline-md text-primary")}>
          {c.title}
        </Text>
        <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>
          {c.subtitle}
        </Text>
      </View>
      <Image
        source={s13Paywall.coachCutout}
        accessibilityLabel="Mirra coach"
        resizeMode="cover"
        style={imageStyle}
      />
    </View>
  );
};
