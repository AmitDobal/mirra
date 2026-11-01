import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, Text, View } from "react-native";

import { s24ProfileSettings } from "../../../assets/stitch";
import type { TrainerPersonaId } from "@/content/trainer-personas";
import { getCurrentPlan, getProfile, type LocalPlan, type LocalProfile } from "@/db";
import { DietPrefsSheet } from "@/features/fuel/DietPrefsSheet";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useOnboardingStore } from "@/features/onboarding";
import { PersonaGrid, usePersonaStore } from "@/features/trainer";
import { clearSession } from "@/lib/auth";
import { authClient } from "@/lib/auth/auth-client";
import { getPurchases } from "@/lib/purchases";
import { usePlanStore } from "@/stores/plan-store";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { sx } from "@/theme/sx";

import { SpeakCuesToggle } from "./SpeakCuesToggle";
import { Divider, Group, Row, StatusRow, ToggleRow } from "./you-settings";

const PRIVACY_URL = "https://adtechservices.in/privacy";
const TERMS_URL = "https://adtechservices.in/terms";

/** S24 You (clean) — Stitch redesign: compact hero, trainer grid, grouped settings. */
export const YouScreen = () => {
  const [rebuildOn, setRebuildOn] = useState(true);
  const [locationId, setLocationId] = useState("gym");
  const [subNote, setSubNote] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const clearPlan = usePlanStore((s) => s.clear);
  const hasMealPlan = useMealPlanStore((s) => s.plan !== null);
  const regenerateMealPlan = useMealPlanStore((s) => s.generate);
  const persona = usePersonaStore((s) => s.persona);
  const personaSaving = usePersonaStore((s) => s.saving);
  const choosePersona = usePersonaStore((s) => s.choose);

  const reload = useCallback(async () => {
    const [p, pl] = await Promise.all([getProfile(), getCurrentPlan()]);
    setProfile(p);
    setPlan(pl);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const prefs = profile?.preferences;
  const goalNice = (prefs?.primaryGoal ?? "training").replace(/_/g, " ");
  const EXP_LABELS: Record<string, string> = {
    new: "New",
    months: "Some months",
    some_months: "Some months",
    y1_2: "1–2 years",
    one_two_years: "1–2 years",
    y3_plus: "3+ years",
    three_plus: "3+ years",
  };
  const expNice = prefs?.experience
    ? (EXP_LABELS[prefs.experience] ??
      prefs.experience.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()))
    : "Member";
  const name =
    profile?.sex != null ? `Athlete · ${goalNice}` : "Mirra athlete";
  const handle = profile
    ? `${expNice} · ${prefs?.sessionMinutes ?? 45} min sessions`
    : "Complete onboarding for profile";
  const protocolTitle = plan?.days.find((d) => d.workout)?.workout?.title ?? "No active plan";
  const protocolBody =
    plan?.summary.outcomeLine ||
    (plan
      ? `${plan.summary.kcalTarget} kcal · ${plan.summary.proteinG}g protein`
      : "Generate a plan to calibrate volume.");
  const planLabel = plan ? `Plan v${plan.version} · ${plan.status}` : "No subscription plan";

  const openUrl = async (url: string) => {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Link", url);
  };

  const handleManageSub = async () => {
    const restored = await getPurchases().restore();
    if (restored.ok) {
      setSubNote("Restored purchases");
      Alert.alert("Subscription", "Purchases restored.");
    } else {
      setSubNote(restored.error.message);
    }
    router.push("/(onboarding)/paywall");
  };

  const handlePrefsSaved = () => {
    setPrefsOpen(false);
    if (!hasMealPlan) return;
    Alert.alert("Food prefs saved", "Rebuild today's meal plan with them?", [
      { text: "Not now", style: "cancel" },
      { text: "Rebuild", onPress: () => void regenerateMealPlan(true) },
    ]);
  };

  const handleChoosePersona = async (id: TrainerPersonaId) => {
    if (id === persona) return;
    if (!(await choosePersona(id))) Alert.alert("Trainer", "Couldn't switch trainer. Try again.");
  };

  const handleSignOut = () => {
    void (async () => {
      try {
        await authClient.signOut();
      } catch {
        /* still clear local session */
      }
      await clearSession();
      resetOnboarding();
      clearPlan();
      router.replace("/(onboarding)/welcome");
    })();
  };

  const locations = [
    { id: "gym", label: "Primary kit" },
    { id: "home", label: "Home" },
    { id: "hotel", label: "Hotel" },
  ] as const;

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-lg flex-row items-center gap-space-md")}>
        <Image
          source={s24ProfileSettings.avatarAlexChen}
          accessibilityLabel="Profile avatar"
          style={{ width: 56, height: 56, borderRadius: 28 }}
          resizeMode="cover"
        />
        <View style={sx("min-w-0 flex-1")}>
          <View style={sx("flex-row items-center gap-space-sm")}>
            <Text
              numberOfLines={1}
              style={sx("min-w-0 flex-shrink font-headline text-headline-sm text-on-surface")}
            >
              {name}
            </Text>
            <View style={sx("shrink-0 rounded-full bg-primary-fixed px-2 py-0.5")}>
              <Text style={sx("font-label-bold text-[9px] leading-3 text-on-primary-fixed")}>
                PRO
              </Text>
            </View>
          </View>
          <Text
            numberOfLines={2}
            style={sx("mt-0.5 font-body text-body-sm text-on-surface-variant")}
          >
            {handle}
          </Text>
        </View>
      </View>

      <View style={sx("mb-space-sm flex-row items-end justify-between gap-space-sm")}>
        <CapsLabel>Your trainer</CapsLabel>
        <Text
          numberOfLines={1}
          style={sx("shrink font-body text-[11px] text-on-surface-variant")}
        >
          Tap to switch
        </Text>
      </View>
      <PersonaGrid
        compact
        value={persona}
        disabled={personaSaving}
        onSelect={(id) => void handleChoosePersona(id)}
      />

      <Group title="Active training">
        <View style={sx("p-space-md")}>
          <CapsLabel>Active plan</CapsLabel>
          <Text style={sx("mt-1 font-label text-label-md text-primary-fixed")}>
            Week of {plan?.weekStart ?? "—"}
          </Text>
          <Text style={sx("mt-space-sm font-headline-sm text-headline-sm text-on-surface")}>
            {protocolTitle}
          </Text>
          <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>{protocolBody}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open coach check-in"
            onPress={() => router.push("/(tabs)/coach")}
            style={sx("mt-space-sm self-start")}
          >
            <Text style={sx("font-label-bold text-label-md text-primary-fixed")}>Open coach →</Text>
          </Pressable>
        </View>
        <Divider />
        <View style={sx("px-space-md py-space-sm")}>
          <CapsLabel style={sx("mb-space-sm")}>Training locations</CapsLabel>
          <View style={sx("flex-row flex-wrap gap-space-sm")}>
            {locations.map((loc) => {
              const active = locationId === loc.id;
              return (
                <Pressable
                  key={loc.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setLocationId(loc.id)}
                  style={sx(
                    `rounded-full px-3 py-2 ${
                      active ? "bg-primary-fixed" : "bg-surface-container-highest"
                    }`,
                  )}
                >
                  <Text
                    numberOfLines={1}
                    style={sx(
                      `font-label text-[11px] leading-4 ${
                        active ? "text-on-primary-fixed" : "text-on-surface"
                      }`,
                    )}
                  >
                    {loc.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Divider />
        <Row title="Food prefs" meta="Diet, cuisines & foods to avoid" onPress={() => setPrefsOpen(true)} />
      </Group>

      <Group title="Coaching">
        <SpeakCuesToggle embedded />
        <Divider />
        <ToggleRow
          title="Adaptive rebuild"
          detail="Redistributes missed sets"
          value={rebuildOn}
          onChange={setRebuildOn}
        />
      </Group>

      <Group title="Subscription">
        <Row
          title={subNote ?? planLabel}
          meta="Manage / restore"
          onPress={() => void handleManageSub()}
        />
      </Group>

      <Group title="Connected">
        <StatusRow title="Apple Health / Watch" meta="Synced" />
        <Divider />
        <StatusRow title="Withings Body Scan" meta="Ready" />
        <Divider />
        <StatusRow title="USDA & Vision Scanner" meta="Ready" />
      </Group>

      <Group title="Legal">
        <Row title="Privacy Policy" meta="Open in browser" onPress={() => void openUrl(PRIVACY_URL)} />
        <Divider />
        <Row title="Terms of Use" meta="Open in browser" onPress={() => void openUrl(TERMS_URL)} />
      </Group>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={handleSignOut}
        style={sx("mt-space-md flex-row items-center justify-center gap-space-sm py-space-md")}
      >
        <LogOut size={16} color={color.error} />
        <Text style={sx("font-label-bold text-label-lg text-error")}>Sign out</Text>
      </Pressable>

      <DietPrefsSheet
        visible={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onSaved={handlePrefsSaved}
      />
    </ScreenScroll>
  );
};
