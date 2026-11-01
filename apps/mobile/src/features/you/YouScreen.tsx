import { router } from "expo-router";
import { RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from "react-native";

import type { TrainerPersonaId } from "@/content/trainer-personas";
import { getCurrentPlan, getProfile, type LocalPlan, type LocalProfile } from "@/db";
import { DietPrefsSheet } from "@/features/fuel/DietPrefsSheet";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useOnboardingStore } from "@/features/onboarding";
import { PersonaGrid, usePersonaStore } from "@/features/trainer";
import { creditsPool } from "@/lib/api/credits";
import type { MeEntitlement, MeUser } from "@/lib/api/me";
import {
  clearSession,
  requireSignedInUser,
  setPostAuthIntent,
} from "@/lib/auth";
import { authClient } from "@/lib/auth/auth-client";
import { useCreditsStore } from "@/stores/credits-store";
import { useMeStore } from "@/stores/me-store";
import { usePlanStore } from "@/stores/plan-store";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { sx } from "@/theme/sx";

import { openAiLimitSheet } from "./AiLimitSheet";
import { CreditsMeter } from "./CreditsMeter";
import { connectedAccountLabels, experienceLabel } from "./profile-display";
import { ProfileHero } from "./ProfileHero";
import { SpeakCuesToggle } from "./SpeakCuesToggle";
import {
  formatCreditsRefreshed,
  persistTrainingLocation,
  toTrainingLocationId,
} from "./training-location";
import { YouFooterGroups } from "./YouFooterGroups";
import { YouTrainingCard, type TrainingLocationId } from "./YouTrainingCard";
import { Divider, Group, Row, ToggleRow } from "./you-settings";

const PRIVACY_URL = "https://adtechservices.in/privacy";
const TERMS_URL = "https://adtechservices.in/terms";

/** S24 You — cached identity hero, credits meter, horizontal trainers. */
export const YouScreen = () => {
  const [locationId, setLocationId] = useState<TrainingLocationId>("gym");
  const [locationSaving, setLocationSaving] = useState(false);
  const [subNote, setSubNote] = useState<string | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const cachedUser = useMeStore((s) => s.cachedUser);
  const cachedEntitlement = useMeStore((s) => s.cachedEntitlement);
  const cachedAccounts = useMeStore((s) => s.cachedAccounts);
  const me = useMeStore((s) => s.me);
  const hydrateMe = useMeStore((s) => s.hydrate);
  const ensureMe = useMeStore((s) => s.ensureMe);
  const refreshMe = useMeStore((s) => s.refreshInBackground);
  const clearMe = useMeStore((s) => s.clear);

  const credits = useCreditsStore((s) => s.credits);
  const cachedCredits = useCreditsStore((s) => s.cachedCredits);
  const creditsFetchedAt = useCreditsStore((s) => s.fetchedAt);
  const hydrateCredits = useCreditsStore((s) => s.hydrate);
  const ensureCredits = useCreditsStore((s) => s.ensureCredits);
  const refreshCredits = useCreditsStore((s) => s.refreshInBackground);
  const clearCredits = useCreditsStore((s) => s.clear);
  const creditsMeter = credits ?? cachedCredits;

  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const clearPlan = usePlanStore((s) => s.clear);
  const hasMealPlan = useMealPlanStore((s) => s.plan !== null);
  const regenerateMealPlan = useMealPlanStore((s) => s.generate);
  const persona = usePersonaStore((s) => s.persona);
  const personaSaving = usePersonaStore((s) => s.saving);
  const choosePersona = usePersonaStore((s) => s.choose);

  const meUser: MeUser | null = me?.user ?? cachedUser;
  const entitlement: MeEntitlement | null = me?.entitlement ?? cachedEntitlement;
  const accountLabels = connectedAccountLabels(me?.accounts ?? cachedAccounts);

  const reloadLocal = useCallback(async () => {
    const [p, pl] = await Promise.all([getProfile(), getCurrentPlan()]);
    setProfile(p);
    setPlan(pl);
    setLocationId(
      toTrainingLocationId(p?.preferences?.trainingLocation ?? me?.preferences?.trainingLocation),
    );
  }, [me?.preferences?.trainingLocation]);

  useEffect(() => {
    void (async () => {
      await Promise.all([hydrateMe(), hydrateCredits()]);
      await reloadLocal();
      refreshMe();
      refreshCredits();
      void ensureMe().catch(() => undefined);
      void ensureCredits().catch(() => undefined);
    })();
  }, [ensureCredits, ensureMe, hydrateCredits, hydrateMe, refreshCredits, refreshMe, reloadLocal]);

  useEffect(() => {
    if (me?.preferences?.trainingLocation) {
      setLocationId(toTrainingLocationId(me.preferences.trainingLocation));
    }
  }, [me?.preferences?.trainingLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([reloadLocal(), ensureMe({ force: true }), ensureCredits({ force: true })]);
    } catch {
      /* keep cache */
    } finally {
      setRefreshing(false);
    }
  }, [ensureCredits, ensureMe, reloadLocal]);

  const prefs = profile?.preferences;
  const goalNice = (prefs?.primaryGoal ?? "training").replace(/_/g, " ");
  const fallbackName = profile?.sex != null ? `Athlete · ${goalNice}` : "Mirra athlete";
  const fallbackMeta = profile
    ? `${experienceLabel(prefs?.experience)} · ${prefs?.sessionMinutes ?? 45} min sessions`
    : "Complete onboarding for profile";
  const planLabel = plan ? `Plan v${plan.version} · ${plan.status}` : "No subscription plan";

  const openUrl = async (url: string) => {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
    else Alert.alert("Link", url);
  };

  const handleManageSub = () => {
    if (!requireSignedInUser()) {
      setPostAuthIntent("paywall");
      router.push("/(onboarding)/auth");
      return;
    }
    setSubNote(null);
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

  const handleLocation = async (id: TrainingLocationId) => {
    if (id === locationId || locationSaving) return;
    const prev = locationId;
    setLocationId(id);
    setLocationSaving(true);
    try {
      await persistTrainingLocation(id);
      void ensureMe({ force: true }).catch(() => undefined);
    } catch {
      setLocationId(prev);
      Alert.alert("Training location", "Couldn't save. Try again.");
    } finally {
      setLocationSaving(false);
    }
  };

  const handleCreditsPress = () => {
    if (creditsMeter && creditsMeter.remaining <= 0) {
      openAiLimitSheet(creditsMeter.resetsAt);
      return;
    }
    const pool = creditsMeter ? creditsPool(creditsMeter) : 0;
    const left = creditsMeter?.remaining ?? 0;
    Alert.alert(
      "AI credits",
      creditsMeter
        ? `${left} of ${pool} left\nLast refreshed ${formatCreditsRefreshed(creditsFetchedAt)}`
        : "Balance not loaded yet.",
      [
        { text: "Close", style: "cancel" },
        { text: "Refresh", onPress: () => void handleRefresh() },
      ],
    );
  };

  const handleSignOut = () => {
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

  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={sx("mb-space-sm flex-row items-center justify-end")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh profile and credits"
          accessibilityState={{ busy: refreshing }}
          disabled={refreshing}
          onPress={() => void handleRefresh()}
          hitSlop={12}
          style={sx("h-11 w-11 items-center justify-center rounded-full")}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={color.primaryFixed} />
          ) : (
            <RefreshCw size={20} color={color.onSurfaceVariant} />
          )}
        </Pressable>
      </View>

      <ProfileHero
        user={meUser}
        entitlement={entitlement}
        fallbackName={fallbackName}
        fallbackMeta={fallbackMeta}
      />

      <Group title="AI credits">
        <CreditsMeter credits={creditsMeter} onPress={handleCreditsPress} />
      </Group>

      <View style={sx("mb-space-sm flex-row items-end justify-between gap-space-sm")}>
        <CapsLabel>Your trainer</CapsLabel>
        <Text numberOfLines={1} style={sx("shrink font-body text-[11px] text-on-surface-variant")}>
          Swipe to choose
        </Text>
      </View>
      <PersonaGrid
        compact
        value={persona}
        disabled={personaSaving}
        onSelect={(id) => void handleChoosePersona(id)}
      />

      <YouTrainingCard
        plan={plan}
        locationId={locationId}
        locationSaving={locationSaving}
        onLocation={(id) => void handleLocation(id)}
        onFoodPrefs={() => setPrefsOpen(true)}
      />

      <Group title="Coaching">
        <SpeakCuesToggle embedded />
        <Divider />
        <ToggleRow
          title="Adaptive rebuild"
          detail="Coming soon — redistributes missed sets after check-in"
          value={false}
          disabled
          onChange={() => undefined}
        />
      </Group>

      <Group title="Subscription">
        <Row
          title={subNote ?? planLabel}
          meta="Manage / restore"
          onPress={handleManageSub}
        />
      </Group>

      <YouFooterGroups
        accountLabels={accountLabels}
        onPrivacy={() => void openUrl(PRIVACY_URL)}
        onTerms={() => void openUrl(TERMS_URL)}
        onSignOut={handleSignOut}
      />

      <DietPrefsSheet
        visible={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        onSaved={handlePrefsSaved}
      />
    </ScreenScroll>
  );
};
