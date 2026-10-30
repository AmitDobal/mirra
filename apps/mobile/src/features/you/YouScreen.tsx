import { router } from "expo-router";
import { ChevronRight, LogOut } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Switch, Text, View } from "react-native";

import { getCurrentPlan, getProfile, type LocalPlan, type LocalProfile } from "@/db";
import { useOnboardingStore } from "@/features/onboarding";
import { getPurchases } from "@/lib/purchases";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { usePlanStore } from "@/stores/plan-store";

const PRIVACY_URL = "https://adtechservices.in/privacy";
const TERMS_URL = "https://adtechservices.in/terms";

const TOGGLES = [
  { id: "rebuild", title: "Adaptive Rebuild", detail: "Redistributes missed sets across microcycle" },
  { id: "rest", title: "Rest Day Aggressiveness", detail: "HRV + Load auto-trigger · Balanced 48h" },
  { id: "voice", title: "Voice Coaching HUD", detail: "Real-time tempo cadences · Minimal Cues" },
] as const;

const HARDWARE = [
  { title: "Apple Health / Watch", meta: "Synced" },
  { title: "Withings Body Scan", meta: "Ready" },
  { title: "USDA & Vision Scanner", meta: "Ready" },
] as const;

/** S24 You — profile + plan from SQLite. */
export const YouScreen = () => {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    rebuild: true,
    rest: true,
    voice: false,
  });
  const [locationId, setLocationId] = useState("gym");
  const [subNote, setSubNote] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const clearPlan = usePlanStore((s) => s.clear);

  useEffect(() => {
    void (async () => {
      const [p, pl] = await Promise.all([getProfile(), getCurrentPlan()]);
      setProfile(p);
      setPlan(pl);
    })();
  }, []);

  const prefs = profile?.preferences;
  const locations = [
    {
      id: "gym",
      title: "Primary kit",
      detail: prefs?.equipment.length
        ? prefs.equipment.join(", ")
        : "Olympic racks, cables, benches",
    },
    {
      id: "home",
      title: "Home Minimal",
      detail: "Adjustable DBs, pull-up bar, bands",
    },
    {
      id: "hotel",
      title: "Hotel & Bodyweight",
      detail: "Calisthenics, tempo control, micro-bands",
    },
  ];

  const name =
    profile?.sex != null
      ? `Athlete · ${prefs?.primaryGoal?.replace(/_/g, " ") ?? "training"}`
      : "Mirra athlete";
  const handle = profile
    ? `${prefs?.experience ?? "member"} · ${prefs?.sessionMinutes ?? 45} min sessions`
    : "Complete onboarding for profile";
  const protocolTitle = plan?.days.find((d) => d.workout)?.workout?.title ?? "No active plan";
  const protocolBody =
    plan?.summary.outcomeLine ||
    (plan
      ? `${plan.summary.kcalTarget} kcal · ${plan.summary.proteinG}g protein`
      : "Generate a plan to calibrate volume.");
  const planLabel = plan ? `Plan v${plan.version} · ${plan.status}` : "No subscription plan";

  const openUrl = async (url: string) => {
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else Alert.alert("Link", url);
  };

  const handleManageSub = async () => {
    const port = getPurchases();
    const restored = await port.restore();
    if (restored.ok) {
      setSubNote("Restored purchases");
      Alert.alert("Subscription", "Purchases restored.");
    } else {
      setSubNote(restored.error.message);
    }
    router.push("/(onboarding)/paywall");
  };

  const handleSignOut = () => {
    resetOnboarding();
    clearPlan();
    router.replace("/(onboarding)/welcome");
  };

  return (
    <ScreenScroll>
      <View className="mb-space-md flex-row items-center gap-space-md">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
          <Text className="font-headline text-headline-md text-on-primary-fixed">
            {(name[0] ?? "M").toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-headline text-headline-md text-on-surface">{name}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">{handle}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage subscription"
        onPress={() => void handleManageSub()}
        className="mb-space-md flex-row items-center justify-between rounded-lg bg-primary-fixed px-space-md py-space-sm"
      >
        <CapsLabel tone="dark">{subNote ?? planLabel}</CapsLabel>
        <Text className="font-label-bold text-label-md text-on-primary-fixed">Manage</Text>
      </Pressable>

      <View className="mb-space-md rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel>Active Protocol Engine</CapsLabel>
        <Text className="mt-1 font-label text-label-md text-primary-fixed">
          Week of {plan?.weekStart ?? "—"}
        </Text>
        <Text className="mt-space-sm font-headline-sm text-headline-sm text-on-surface">
          {protocolTitle}
        </Text>
        <Text className="mt-1 font-body text-body-md text-on-surface-variant">{protocolBody}</Text>
        <LimeCta
          label="Recalibrate Goals & Volume"
          onPress={() => router.push("/(tabs)/coach")}
          className="mt-space-md"
        />
      </View>

      <CapsLabel className="mb-space-sm">Equipment Locations · 3 Presets</CapsLabel>
      {locations.map((loc) => (
        <Pressable
          key={loc.id}
          accessibilityRole="button"
          accessibilityState={{ selected: locationId === loc.id }}
          onPress={() => setLocationId(loc.id)}
          className={`mb-space-sm rounded-lg border p-space-md ${
            locationId === loc.id
              ? "border-primary-fixed bg-surface-container-low"
              : "border-transparent bg-surface-container-high"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{loc.title}</Text>
            {locationId === loc.id ? (
              <CapsLabel tone="lime">Active</CapsLabel>
            ) : (
              <Text className="font-label text-label-md text-on-surface-variant">Select</Text>
            )}
          </View>
          <Text className="mt-1 font-body text-body-sm text-on-surface-variant">{loc.detail}</Text>
        </Pressable>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add location profile"
        onPress={() => Alert.alert("Locations", "Custom location profiles land in v2.")}
        className="mb-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-primary-fixed">+ Add New Location Profile</Text>
      </Pressable>

      <CapsLabel className="mb-space-sm">Intelligence & HUD Controls</CapsLabel>
      {TOGGLES.map((t) => (
        <View
          key={t.id}
          className="mb-space-sm flex-row items-center justify-between rounded-lg bg-surface-container-high p-space-md"
        >
          <View className="mr-space-md flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{t.title}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{t.detail}</Text>
          </View>
          <Switch
            accessibilityLabel={t.title}
            value={!!toggles[t.id]}
            onValueChange={(v) => setToggles((prev) => ({ ...prev, [t.id]: v }))}
            trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixedDim }}
            thumbColor={toggles[t.id] ? color.onPrimaryFixed : color.onSurfaceVariant}
          />
        </View>
      ))}

      <CapsLabel className="mb-space-sm mt-space-sm">Connected Hardware & Sync</CapsLabel>
      {HARDWARE.map((h) => (
        <Row
          key={h.title}
          title={h.title}
          meta={h.meta}
          onPress={() => Alert.alert(h.title, `${h.meta} · sync status updated`)}
        />
      ))}

      <CapsLabel className="mb-space-sm mt-space-md">Privacy & Data Engine</CapsLabel>
      <Row title="Privacy Policy" meta="Open in browser" onPress={() => void openUrl(PRIVACY_URL)} />
      <Row title="Terms of Use" meta="Open in browser" onPress={() => void openUrl(TERMS_URL)} />
      <Row
        title="Subscription & Billing"
        meta="Restore / paywall"
        onPress={() => void handleManageSub()}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={handleSignOut}
        className="mt-space-lg flex-row items-center justify-center gap-space-sm rounded-full bg-surface-container-highest py-space-md"
      >
        <LogOut size={18} color={color.error} />
        <Text className="font-label-bold text-label-lg text-error">Log Out</Text>
      </Pressable>
      <Text className="mt-space-md text-center font-body text-body-sm text-on-surface-variant">
        Mirra · local SQLite profile
      </Text>
    </ScreenScroll>
  );
};

const Row = ({
  title,
  meta,
  onPress,
}: {
  title: string;
  meta: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={onPress}
    className="mb-space-xs flex-row items-center justify-between rounded-lg bg-surface-container-high px-space-md py-space-md"
  >
    <View>
      <Text className="font-headline-sm text-headline-sm text-on-surface">{title}</Text>
      <Text className="font-body text-body-sm text-on-surface-variant">{meta}</Text>
    </View>
    <ChevronRight size={18} color={color.onSurfaceVariant} />
  </Pressable>
);
