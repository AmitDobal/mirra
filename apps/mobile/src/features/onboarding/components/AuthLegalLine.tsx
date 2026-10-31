import { Linking, Text } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { errorMessage, logger } from "@/lib/logger";
import { sx } from "@/theme/sx";

const handleOpenUrl = (url: string) => {
  void (async () => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      logger.error("auth.legal.open_failed", { message: errorMessage(err) });
    }
  })();
};

/** S14 footer — "By continuing…" with tappable Privacy / Terms. */
export const AuthLegalLine = () => {
  const c = onboardingCopy.auth;
  const linkStyle = sx("font-body text-body-sm text-on-surface-variant underline");

  return (
    <Text
      style={sx("mx-space-md mb-space-sm text-center font-body text-body-sm text-on-surface-variant/60")}
    >
      {c.legalLead}
      <Text
        accessibilityRole="link"
        style={linkStyle}
        onPress={() => handleOpenUrl(c.privacyUrl)}
      >
        {c.privacyLink}
      </Text>
      {c.legalMid}
      <Text
        accessibilityRole="link"
        style={linkStyle}
        onPress={() => handleOpenUrl(c.termsUrl)}
      >
        {c.termsLink}
      </Text>
      .
    </Text>
  );
};
