import { router } from "expo-router";
import { Alert, Linking } from "react-native";

import { useOnboardingStore } from "@/features/onboarding";
import { creditsPool, type CreditsSnapshot } from "@/lib/api/credits";
import { clearSession, requireSignedInUser, setPostAuthIntent } from "@/lib/auth";
import { authClient } from "@/lib/auth/auth-client";
import { useCreditsStore } from "@/stores/credits-store";
import { useMeStore } from "@/stores/me-store";
import { usePlanStore } from "@/stores/plan-store";

import { openAiLimitSheet } from "./AiLimitSheet";
import { formatCreditsRefreshed } from "./training-location";

const PRIVACY_URL = "https://adtechservices.in/privacy";
const TERMS_URL = "https://adtechservices.in/terms";

const openUrl = async (url: string) => {
  if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  else Alert.alert("Link", url);
};

/** You-tab account actions (unchanged from S24): subscription, legal links, credits, sign out. */
export const useYouActions = (opts: {
  credits: CreditsSnapshot | null;
  creditsFetchedAt: number;
  onRefresh: () => void;
}) => {
  const clearMe = useMeStore((s) => s.clear);
  const clearCredits = useCreditsStore((s) => s.clear);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const clearPlan = usePlanStore((s) => s.clear);

  const manageSub = () => {
    if (!requireSignedInUser()) {
      setPostAuthIntent("paywall");
      router.push("/(onboarding)/auth");
      return;
    }
    router.push("/(onboarding)/paywall");
  };

  const creditsPress = () => {
    const { credits } = opts;
    if (credits && credits.remaining <= 0) {
      openAiLimitSheet(credits.resetsAt);
      return;
    }
    const pool = credits ? creditsPool(credits) : 0;
    Alert.alert(
      "AI credits",
      credits
        ? `${credits.remaining} of ${pool} left\nLast refreshed ${formatCreditsRefreshed(opts.creditsFetchedAt)}`
        : "Balance not loaded yet.",
      [
        { text: "Close", style: "cancel" },
        { text: "Refresh", onPress: opts.onRefresh },
      ],
    );
  };

  const signOut = () => {
    void (async () => {
      try {
        await authClient.signOut();
      } catch {
        /* still clear local */
      }
      await clearMe();
      await clearCredits();
      await clearSession();
      resetOnboarding();
      clearPlan();
      router.replace("/(onboarding)/welcome");
    })();
  };

  return {
    manageSub,
    creditsPress,
    signOut,
    openPrivacy: () => void openUrl(PRIVACY_URL),
    openTerms: () => void openUrl(TERMS_URL),
  };
};
