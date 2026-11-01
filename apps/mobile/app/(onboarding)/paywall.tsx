import { router } from "expo-router";
import { ArrowRight, X, Zap } from "lucide-react-native";
import { useEffect } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { PaywallFeatureList } from "@/features/onboarding/components/PaywallFeatureList";
import { PaywallHero } from "@/features/onboarding/components/PaywallHero";
import { PaywallPlanCard } from "@/features/onboarding/components/PaywallPlanCard";
import { completeOnboardingFunnel } from "@/features/onboarding/services/complete-funnel";
import {
  hasSession,
  requireSignedInUser,
  setPostAuthIntent,
} from "@/lib/auth";
import { shouldReplaceFunnelDest } from "@/lib/auth/funnel-nav";
import { usePurchases } from "@/lib/purchases";
import { color } from "@/theme/tokens";
import { LimeCta } from "@/ui";
import { sx } from "@/theme/sx";

/** S13 — Hard paywall. Trial / restore / terms only. No continue without Pro. X never grants Pro. */
const PaywallScreen = () => {
  const c = onboardingCopy.paywall;
  const plan = useOnboardingStore((s) => s.paywallPlan);
  const setPaywallPlan = useOnboardingStore((s) => s.setPaywallPlan);
  const { loading, purchase, restore, loadOfferings, offerings } = usePurchases();

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  const finishPro = () => {
    void completeOnboardingFunnel().then(() => {
      if (!shouldReplaceFunnelDest("/(tabs)/today")) return;
      router.replace("/(tabs)/today");
    });
  };

  const goAuth = (intent: "paywall" | "tabs") => {
    setPostAuthIntent(intent);
    router.push("/(onboarding)/auth");
  };

  const packageId =
    offerings[0]?.packages.find((p) =>
      plan === "annual"
        ? /annual|year/i.test(p.identifier)
        : /month/i.test(p.identifier),
    )?.identifier ??
    offerings[0]?.packages[0]?.identifier ??
    (plan === "annual" ? "$rc_annual" : "$rc_monthly");

  const ensureGoogleForPurchase = (): boolean => {
    if (requireSignedInUser()) return true;
    goAuth("paywall");
    return false;
  };

  const handleTrial = async () => {
    if (!ensureGoogleForPurchase()) return;
    const result = await purchase(packageId);
    if (result?.ok) finishPro();
  };

  const handleRestore = async () => {
    if (!ensureGoogleForPurchase()) return;
    const result = await restore();
    if (result?.ok) finishPro();
  };

  /**
   * Hard close: no Continue without Pro. No session → auth; session → blocked alert.
   * Day-test bypass lives on auth Dev Tester only (`finishAfterAuth("dev")`).
   */
  const handleClose = () => {
    if (!hasSession()) {
      goAuth("paywall");
      return;
    }
    Alert.alert(c.blockedTitle, c.blockedBody);
  };

  const handleTerms = () => {
    void Linking.openURL(onboardingCopy.auth.termsUrl);
  };

  const handlePrivacy = () => {
    void Linking.openURL(onboardingCopy.auth.privacyUrl);
  };

  return (
    <OnboardingShell
      header={
        <View style={sx("flex-row items-center justify-between pb-space-md")}>
          <View
            style={sx(
              "flex-row items-center gap-space-xs rounded-full bg-primary-container px-space-md py-space-xs",
            )}
          >
            <Zap color={color.onPrimaryFixed} fill={color.onPrimaryFixed} size={14} />
            <Text style={sx("font-label-bold text-label-caps uppercase text-on-primary-fixed")}>
              {c.badge}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.closeLabel}
            onPress={handleClose}
            hitSlop={8}
            style={sx("h-9 w-9 items-center justify-center rounded-full bg-surface-container-high")}
          >
            <X color={color.onSurface} size={18} />
          </Pressable>
        </View>
      }
      footer={
        <View style={sx("items-center gap-space-sm pb-space-xs")}>
          <LimeCta
            label={loading ? "…" : c.trial}
            icon={<ArrowRight color={color.onPrimaryFixed} size={18} />}
            onPress={() => void handleTrial()}
            style={sx("w-full")}
          />
          <View style={sx("flex-row items-center justify-center gap-space-md pt-space-xs")}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.restore}
              onPress={() => void handleRestore()}
              hitSlop={8}
            >
              <Text style={sx("font-label text-label-md text-on-surface-variant")}>
                {c.restore}
              </Text>
            </Pressable>
            <Text style={sx("font-body text-body-sm text-surface-container-highest")}>•</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={c.termsLink}
              onPress={handleTerms}
              hitSlop={8}
            >
              <Text style={sx("font-label text-label-md text-on-surface-variant")}>
                {c.termsLink}
              </Text>
            </Pressable>
            <Text style={sx("font-body text-body-sm text-surface-container-highest")}>•</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={c.privacyLink}
              onPress={handlePrivacy}
              hitSlop={8}
            >
              <Text style={sx("font-label text-label-md text-on-surface-variant")}>
                {c.privacyLink}
              </Text>
            </Pressable>
          </View>
          <Text
            style={sx(
              "max-w-xs text-center font-body text-[10px] leading-tight text-on-surface-variant",
            )}
          >
            {c.legal}
          </Text>
        </View>
      }
    >
      <View style={sx("gap-space-md")}>
        <PaywallHero />
        <PaywallFeatureList />
        <View style={sx("gap-space-sm")}>
          <PaywallPlanCard
            title={c.annual}
            note={c.annualPerMo}
            price={c.annualPrice}
            unit={c.annualUnit}
            badge={c.best}
            selected={plan === "annual"}
            onSelect={() => setPaywallPlan("annual")}
          />
          <PaywallPlanCard
            title={c.monthly}
            note={c.monthlyNote}
            price={c.monthlyPrice}
            unit={c.monthlyUnit}
            selected={plan === "monthly"}
            onSelect={() => setPaywallPlan("monthly")}
          />
        </View>
      </View>
    </OnboardingShell>
  );
};

export default PaywallScreen;
