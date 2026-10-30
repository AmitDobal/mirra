import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { s13Paywall } from "../../assets/stitch";
import { onboardingCopy } from "@/content/onboarding";
import { OnboardingShell, useOnboardingStore } from "@/features/onboarding";
import { usePurchases } from "@/lib/purchases";
import { color } from "@/theme/tokens";
import { Button, Card } from "@/ui";

/** S13 — Soft paywall (stub OK) → tabs. */
const PaywallScreen = () => {
  const c = onboardingCopy.paywall;
  const plan = useOnboardingStore((s) => s.paywallPlan);
  const setPaywallPlan = useOnboardingStore((s) => s.setPaywallPlan);
  const markCompleted = useOnboardingStore((s) => s.markCompleted);
  const { loading, purchase, restore, loadOfferings, offerings } = usePurchases();

  useEffect(() => {
    void loadOfferings();
  }, [loadOfferings]);

  const finish = () => {
    markCompleted();
    router.replace("/(tabs)/today");
  };

  const packageId =
    offerings[0]?.packages.find((p) =>
      plan === "annual"
        ? /annual|year/i.test(p.identifier)
        : /month/i.test(p.identifier),
    )?.identifier ??
    offerings[0]?.packages[0]?.identifier ??
    (plan === "annual" ? "$rc_annual" : "$rc_monthly");

  const handleTrial = async () => {
    await purchase(packageId);
    finish();
  };

  const handleRestore = async () => {
    await restore();
    finish();
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
          <Button
            label={loading ? "…" : c.trial}
            onPress={() => void handleTrial()}
          />
          <Button
            label={c.restore}
            variant="ghost"
            onPress={() => void handleRestore()}
          />
          <Text className="text-center font-body text-body-sm text-outline">
            {c.legal}
          </Text>
        </>
      }
    >
      <View className="mb-space-md items-center">
        <Image
          source={s13Paywall.coachCutout}
          accessibilityLabel="Mirra coach"
          style={{ width: 112, height: 112, borderRadius: 56 }}
          resizeMode="cover"
        />
      </View>
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
