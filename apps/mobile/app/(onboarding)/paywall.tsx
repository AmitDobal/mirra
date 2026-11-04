import { router } from "expo-router";
import { ArrowRight, X, Zap } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { PaywallFeatureList } from "@/features/onboarding/components/PaywallFeatureList";
import { PaywallHero } from "@/features/onboarding/components/PaywallHero";
import { PaywallPlanCard } from "@/features/onboarding/components/PaywallPlanCard";
import { completeOnboardingFunnel } from "@/features/onboarding/services/complete-funnel";
import { grantDevEntitlement } from "@/lib/api/credits";
import {
  canDevTrial,
  hasSession,
  requireSignedInUser,
  setPostAuthIntent,
  takeRestoreResume,
} from "@/lib/auth";
import { shouldReplaceFunnelDest } from "@/lib/auth/funnel-nav";
import {
  classifyRestore,
  MIRRA_PRO_ENTITLEMENT,
  usePurchases,
} from "@/lib/purchases";
import { useEntitlementStore } from "@/stores/entitlement-store";
import { useMeStore } from "@/stores/me-store";
import { color } from "@/theme/tokens";
import { LimeCta } from "@/ui";
import { sx } from "@/theme/sx";

/** S13 — Hard paywall. Trial / restore / terms only. No continue without Pro. X never grants Pro. */
const PaywallScreen = () => {
  const c = onboardingCopy.paywall;
  const plan = useOnboardingStore((s) => s.paywallPlan);
  const setPaywallPlan = useOnboardingStore((s) => s.setPaywallPlan);
  const { loading, error, purchase, restore, loadOfferings, offerings } = usePurchases();
  const resumedRestore = useRef(false);

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  const finishPro = () => {
    void completeOnboardingFunnel().then(() => {
      if (!shouldReplaceFunnelDest("/(tabs)/today")) return;
      router.replace("/(tabs)/today");
    });
  };

  const goAuth = (intent: "paywall" | "tabs" | "restore") => {
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

  const ensureGoogleForPurchase = (
    intent: "paywall" | "restore" = "paywall",
  ): boolean => {
    if (requireSignedInUser()) return true;
    goAuth(intent);
    return false;
  };

  const handleTrial = async () => {
    // Dev/day-test Dev Tester: no store, no Google. Grant the API dev entitlement (AMI-183).
    if (canDevTrial()) {
      try {
        await grantDevEntitlement();
        useEntitlementStore.getState().setStatus("active");
        void useMeStore.getState().ensureMe({ force: true }).catch(() => undefined);
        finishPro();
      } catch {
        Alert.alert(c.devTrialFailedTitle, c.devTrialFailedBody);
      }
      return;
    }
    if (!ensureGoogleForPurchase()) return;
    const result = await purchase(packageId);
    if (result?.ok) finishPro();
  };

  /** Restore must find an active `pro` entitlement — empty/stub ok never unlocks. */
  const runRestore = async () => {
    const outcome = classifyRestore(await restore(), MIRRA_PRO_ENTITLEMENT);
    if (outcome.kind === "pro") {
      finishPro();
      return;
    }
    if (outcome.kind === "error") {
      Alert.alert(
        c.restoreErrorTitle,
        outcome.message || c.restoreErrorFallback,
      );
      return;
    }
    Alert.alert(c.restoreNoneTitle, c.restoreNoneBody);
  };

  const handleRestore = async () => {
    if (!ensureGoogleForPurchase("restore")) return;
    await runRestore();
  };

  /** Google auth returned with intent=restore → restore once, no second tap. */
  useEffect(() => {
    if (resumedRestore.current) return;
    if (!takeRestoreResume()) return;
    resumedRestore.current = true;
    void runRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchaseErrorText =
    error && error.code !== "cancelled"
      ? error.message || c.purchaseErrorFallback
      : null;

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
          <View style={sx("flex-row items-center gap-space-sm")}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.restore}
              onPress={() => void handleRestore()}
              hitSlop={8}
              style={sx("px-space-sm py-space-xs")}
            >
              <Text style={sx("font-label text-label-lg text-primary")}>{c.restoreShort}</Text>
            </Pressable>
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
        </View>
      }
      footer={
        <View style={sx("items-center gap-space-sm pb-space-xs")}>
          {purchaseErrorText ? (
            <Text
              accessibilityRole="alert"
              style={sx("text-center font-body text-body-sm text-error")}
            >
              {purchaseErrorText}
            </Text>
          ) : null}
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
