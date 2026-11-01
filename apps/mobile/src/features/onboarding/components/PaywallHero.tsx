import {
  Image,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
} from "react-native";

import { s13PaywallHard } from "../../../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { sx } from "@/theme/sx";

type Props = {
  /**
   * Optional coach image (AMI-147 gendered helper can pass this).
   * Defaults to hard-paywall Stitch athlete cutout.
   */
  readonly coachSource?: ImageSourcePropType;
};

const imageStyle: ImageStyle = {
  width: 96,
  height: 96,
  borderRadius: 16,
};

/** S13 hero — copy left, rounded athlete tile right (Stitch hard paywall). */
export const PaywallHero = ({
  coachSource = s13PaywallHard.coachAthlete,
}: Props) => {
  const c = onboardingCopy.paywall;

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
        source={coachSource}
        accessibilityLabel="Mirra coach"
        resizeMode="cover"
        style={imageStyle}
      />
    </View>
  );
};
