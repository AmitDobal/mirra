import { router } from "expo-router";
import { X } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { color } from "@/theme/tokens";
import { Button, Card } from "@/ui";

/** S13 — Soft paywall stub → tabs (mark onboarding complete). */
const PaywallScreen = () => {
  const c = onboardingCopy.paywall;
  const plan = useOnboardingStore((s) => s.paywallPlan);
  const setPaywallPlan = useOnboardingStore((s) => s.setPaywallPlan);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);

  const finish = () => {
    markCompleted();
    router.replace("/(tabs)/today");
  };

  const goAuth = () => router.push("/(onboarding)/auth");

  return (
    <OnboardingShell
      header={
        <View className="items-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close paywall"
            onPress={goAuth}
            hitSlop={12}
            className="h-touch w-touch items-center justify-center"
          >
            <X color={color.onSurface} size={22} />
          </Pressable>
        </View>
      }
      footer={
        <>
          <Button label={c.trial} onPress={finish} />
          <Button label={c.restore} variant="ghost" onPress={finish} />
          <Text className="text-center font-body text-body-sm text-outline">
            {c.legal}
          </Text>
        </>
      }
    >
      <Text className="font-headline text-headline-lg text-on-surface">
        {c.title}
      </Text>
      <View className="mt-space-lg gap-space-sm">
        {c.benefits.map((b) => (
          <Card key={b} tone="lavender" className="px-space-md py-space-sm">
            <Text className="font-body-semi text-body-md text-on-secondary-container">
              {b}
            </Text>
          </Card>
        ))}
      </View>

      <View className="mt-space-xl gap-space-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: plan === "annual" }}
          onPress={() => setPaywallPlan("annual")}
        >
          <Card
            tone="elevated"
            className={`border p-space-md ${
              plan === "annual"
                ? "border-primary-container"
                : "border-transparent"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <View className="mb-1 flex-row items-center gap-space-sm">
                  <Text className="font-headline-semi text-headline-sm text-on-surface">
                    {c.annual}
                  </Text>
                  <View className="rounded-full bg-primary-container px-space-sm py-0.5">
                    <Text className="font-label-bold text-label-caps text-on-primary-fixed">
                      {c.best}
                    </Text>
                  </View>
                </View>
                <Text className="font-body text-body-sm text-on-surface-variant">
                  {c.annualPerMo}
                </Text>
              </View>
              <Text className="font-label text-label-lg text-on-surface">
                {c.annualPrice}
              </Text>
            </View>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: plan === "monthly" }}
          onPress={() => setPaywallPlan("monthly")}
        >
          <Card
            tone="elevated"
            className={`border p-space-md ${
              plan === "monthly"
                ? "border-primary-container"
                : "border-transparent"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-headline-semi text-headline-sm text-on-surface">
                {c.monthly}
              </Text>
              <Text className="font-label text-label-lg text-on-surface">
                {c.monthlyPrice}
              </Text>
            </View>
          </Card>
        </Pressable>
      </View>
    </OnboardingShell>
  );
};

export default PaywallScreen;
