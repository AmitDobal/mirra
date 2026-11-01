import { router } from "expo-router";
import { ChevronLeft, Mail, Zap } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { AppleGlyph, GoogleGlyph } from "@/features/onboarding/components/AuthGlyphs";
import { AuthLegalLine } from "@/features/onboarding/components/AuthLegalLine";
import { AuthPlanCard } from "@/features/onboarding/components/AuthPlanCard";
import { authClient } from "@/lib/auth/auth-client";
import { getBearerToken, setDevSession, setGoogleSession } from "@/lib/auth";
import { GoogleSignInButton } from "@/lib/auth/GoogleSignInButton";
import { env } from "@/lib/config/env";
import { errorMessage, logger } from "@/lib/logger";
import { Button } from "@/ui";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const devAuthAllowed = __DEV__ || env.allowDevAuth;
const googleConfigured = env.googleWebClientId.length > 0;

/** S14 — Auth → tabs. Dev tester for sim; Google via Better Auth when client IDs exist. */
const AuthScreen = () => {
  const c = onboardingCopy.auth;
  const markCompleted = useOnboardingStore((s) => s.markCompleted);
  const goal = useOnboardingStore((s) => s.goal);
  const trainingDays = useOnboardingStore((s) => s.trainingDays);
  const kcalTarget = useOnboardingStore((s) => s.weekPlan?.summary?.kcalTarget);

  const goalLabel = onboardingCopy.goal.options.find((o) => o.id === goal)?.label;
  const planTitle = goalLabel
    ? `${c.planFallbackName} · ${goalLabel}`
    : c.planFallbackName;
  const sessionsPerWeek = trainingDays.filter(Boolean).length;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
  };

  const finishOnboarding = () => {
    markCompleted();
    router.replace("/(tabs)/today");
  };

  const handleDevTester = () => {
    void (async () => {
      await setDevSession();
      finishOnboarding();
    })();
  };

  const handleNotNow = () => {
    if (devAuthAllowed) {
      handleDevTester();
      return;
    }
    Alert.alert(c.authRequiredTitle, c.authRequiredBody);
  };

  const handleComingSoon = () => {
    Alert.alert(c.comingSoonTitle, c.comingSoonBody);
  };

  const handleGoogleMissing = () => {
    Alert.alert(c.googleMissingTitle, c.googleMissingBody);
  };

  const handleGoogleIdToken = (idToken: string) => {
    void (async () => {
      try {
        const { data, error } = await authClient.signIn.social({
          provider: "google",
          idToken: { token: idToken },
        });
        if (error) {
          logger.error("auth.google.better_auth_failed", {
            message: error.message ?? "unknown",
          });
          Alert.alert(c.googleFailedTitle, error.message ?? c.googleFailedBody);
          return;
        }
        const userId =
          data && "user" in data && data.user?.id ? data.user.id : null;
        if (!userId) {
          // Browser redirect flow — session cookie may still land via Expo plugin.
          const session = await authClient.getSession();
          const sessionUserId = session.data?.user?.id;
          if (!sessionUserId) {
            Alert.alert(c.googleFailedTitle, c.googleFailedBody);
            return;
          }
          await setGoogleSession(sessionUserId);
          logger.info("auth.google.session_ok");
          finishOnboarding();
          return;
        }
        const tokenFromBody =
          data && "token" in data && typeof data.token === "string"
            ? data.token
            : null;
        // Prefer body token; else bearer already captured from set-auth-token.
        await setGoogleSession(userId, tokenFromBody ?? getBearerToken());
        logger.info("auth.google.session_ok");
        finishOnboarding();
      } catch (err) {
        logger.error("auth.google.exception", { message: errorMessage(err) });
        Alert.alert(c.googleFailedTitle, errorMessage(err));
      }
    })();
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
        {googleConfigured ? (
          <GoogleSignInButton label={c.google} onIdToken={handleGoogleIdToken} />
        ) : (
          <Button
            label={c.google}
            variant="surfaceLow"
            size="tall"
            icon={<GoogleGlyph />}
            onPress={handleGoogleMissing}
          />
        )}
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
              {c.devTester}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </OnboardingShell>
  );
};

export default AuthScreen;
