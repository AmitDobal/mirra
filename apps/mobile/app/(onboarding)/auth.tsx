import { router } from "expo-router";
import { ChevronLeft, Mail, Zap } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { AppleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { AuthLegalLine } from "@/features/onboarding/components/AuthLegalLine";
import { AuthPlanCard } from "@/features/onboarding/components/AuthPlanCard";
import { finishAfterAuth } from "@/features/onboarding/services/post-auth-flow";
import {
  getBearerToken,
  hasSession,
  peekPostAuthIntent,
  setDevSession,
  setGoogleSession,
} from "@/lib/auth";
import { GoogleSignInButton } from "@/lib/auth/GoogleSignInButton";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import { getPurchases } from "@/lib/purchases";
import { Button } from "@/ui";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const devAuthAllowed = __DEV__ || env.allowDevAuth;

/** S14 — Google save-plan. Routing after sign-in comes from /v1/me (`finishAfterAuth`). */
const AuthScreen = () => {
  const c = onboardingCopy.auth;
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const kcalTarget = useOnboardingStore((s) => s.weekPlan?.summary?.kcalTarget);
  const autoRan = useRef(false);
  const paywallIntent = peekPostAuthIntent() === "paywall";

  const goalLabel = onboardingCopy.goal.options.find((o) => o.id === goal)?.label;
  const planTitle = goalLabel
    ? `${c.planFallbackName} · ${goalLabel}`
    : c.planFallbackName;
  const sessionsPerWeek = trainingDays.filter(Boolean).length;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  /** Session already exists (back-nav / deep link): skip auth UI, route from /v1/me. */
  useEffect(() => {
    if (autoRan.current) return;
    if (!hasSession()) return;
    autoRan.current = true;
    void finishAfterAuth("existing");
  }, []);

  const handleDevTester = () => {
    void (async () => {
      await setDevSession();
      await finishAfterAuth("dev");
    })();
  };

  /** Never skip signup via Not now — Google (or existing Google session) only. */
  const handleNotNow = () => {
    Alert.alert(c.authRequiredTitle, c.authRequiredBody);
  };

  const handleComingSoon = () => {
    Alert.alert(c.comingSoonTitle, c.comingSoonBody);
  };

  const handleGoogleSignedIn = (userId: string, bearer?: string | null) => {
    void (async () => {
      await setGoogleSession(userId, bearer ?? getBearerToken());
      try {
        await getPurchases().logIn(userId);
      } catch {
        /* stub/RC login optional; session still valid */
      }
      logger.info("auth.google.session_ok");
      await finishAfterAuth("google");
    })();
  };

  const handleGoogleError = (message: string) => {
    Alert.alert(c.googleFailedTitle, message || c.googleFailedBody);
  };

  return (
    <OnboardingShell
      header={
        <View style={sx("flex-row items-center justify-between pb-space-md")}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.backLabel}
            onPress={handleBack}
            style={sx("h-10 w-10 items-center justify-center rounded-full bg-surface-container")}
          >
            <ChevronLeft color={color.onSurface} size={20} />
          </Pressable>
          <Text style={sx("font-headline-semi text-headline-sm uppercase tracking-widest text-on-surface")}>
            {c.wordmark}
          </Text>
          <View style={sx("h-10 w-10")} />
        </View>
      }
      footer={<AuthLegalLine />}
    >
      <View style={sx("items-start gap-space-sm")}>
        <View
          style={sx("flex-row items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-space-xs")}
        >
          <Zap color={color.onPrimaryFixed} fill={color.onPrimaryFixed} size={13} />
          <Text style={sx("font-label-bold text-label-caps uppercase text-on-primary-fixed")}>
            {c.badge}
          </Text>
        </View>
        <Text style={sx("font-headline text-headline-lg text-primary")}>{c.title}</Text>
        <Text style={sx("max-w-[320px] font-body text-body-md text-on-surface-variant")}>
          {c.subtitle}
        </Text>
      </View>

      <View style={sx("mt-space-lg")}>
        <AuthPlanCard
          title={planTitle}
          sessionsPerWeek={sessionsPerWeek}
          kcalTarget={kcalTarget}
        />
      </View>

      <View style={sx("mt-space-lg gap-space-md")}>
        <Button
          label={c.apple}
          variant="apple"
          size="tall"
          icon={<AppleGlyph />}
          onPress={handleComingSoon}
        />
        <GoogleSignInButton
          label={c.google}
          onSignedIn={handleGoogleSignedIn}
          onError={handleGoogleError}
        />
        <Button
          label={c.email}
          variant="surface"
          size="tall"
          icon={<Mail color={color.onSurfaceVariant} size={20} />}
          onPress={handleComingSoon}
        />
      </View>

      <View style={sx("mt-space-sm items-center")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.notNow}
          onPress={handleNotNow}
          hitSlop={8}
          style={sx("px-space-md py-space-sm")}
        >
          <Text style={sx("font-body text-body-md text-on-surface-variant")}>{c.notNow}</Text>
        </Pressable>
        {devAuthAllowed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.devTester}
            onPress={handleDevTester}
            hitSlop={8}
            style={sx("px-space-md py-space-xs")}
          >
            <Text style={sx("font-label text-label-md text-primary-container")}>
              {paywallIntent ? c.devTesterPaywall : c.devTester}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </OnboardingShell>
  );
};

export default AuthScreen;
