import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";

import { profileCopy } from "@/content/profile";
import type { TrainerPersonaId } from "@/content/trainer-personas";
import { getCurrentPlan, getProfile, patchLocalProfile, type LocalPlan, type LocalProfile } from "@/db";
import type { LocalProfilePatch } from "@/db/repositories/profile-patch";
import { DietPrefsSheet } from "@/features/fuel/DietPrefsSheet";
import { useMealPlanStore } from "@/features/fuel/meal-plan-store";
import { useBadgeStore } from "@/features/rank/badge-store";
import { goalStore } from "@/features/goal/goal-store";
import { useStrengthStore } from "@/features/strength";
import { usePersonaStore } from "@/features/trainer";
import type { FoodPrefs, MeEntitlement, MeUser } from "@/lib/api/me";
import { useCreditsStore } from "@/stores/credits-store";
import { useMeStore } from "@/stores/me-store";
import { space } from "@/theme/tokens";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { PersonalDetailsRow, PersonalDetailsSheet } from "./PersonalDetails";
import { GoalTimelineCard } from "./GoalTimelineCard";
import { ProfileCard } from "./ProfileCard";
import { ProfileEditSheet } from "./ProfileEditSheet";
import { connectedAccountLabels, subscriptionLabel } from "./profile-display";
import { isSheetField, type EditableField } from "./profile-fields";
import { buildProfileView, experienceText, pickProfileSources, type ProfileRowId } from "./profile-format";
import { RebuildPrompt } from "./RebuildPrompt";
import { RowsSection } from "./RowsSection";
import { persistTrainingLocation, toTrainingLocationId } from "./training-location";
import { useDeleteAccount } from "./use-delete-account";
import { useProfileEdit } from "./use-profile-edit";
import { useYouActions } from "./use-you-actions";
import { YouCoachSection, YouCreditsCard } from "./YouCards";
import { YouFooterGroups } from "./YouFooterGroups";
import { YouTiles } from "./YouTiles";
import { YouTrainingCard, type TrainingLocationId } from "./YouTrainingCard";

/** Extra room under Danger zone so the last row clears the floating dock on Android (QA). */
const DOCK_TAIL = space.dock;

/**
 * S41 You / Profile v2 — every onboarding answer, grouped Training / Nutrition / Coach.
 * PM (AMI-176): Body fields sit behind "Personal details" (sheet), not on the main scroll.
 */
export const YouScreen = () => {
  const [locationId, setLocationId] = useState<TrainingLocationId>("gym");
  const [locationSaving, setLocationSaving] = useState(false);
  const [local, setLocal] = useState<LocalProfile | null>(null);
  const [plan, setPlan] = useState<LocalPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const me = useMeStore((s) => s.me);
  const cachedUser = useMeStore((s) => s.cachedUser);
  const cachedEntitlement = useMeStore((s) => s.cachedEntitlement);
  const cachedAccounts = useMeStore((s) => s.cachedAccounts);
  const hydrateMe = useMeStore((s) => s.hydrate);
  const ensureMe = useMeStore((s) => s.ensureMe);
  const refreshMe = useMeStore((s) => s.refreshInBackground);

  const credits = useCreditsStore((s) => s.credits ?? s.cachedCredits);
  const creditsFetchedAt = useCreditsStore((s) => s.fetchedAt);
  const hydrateCredits = useCreditsStore((s) => s.hydrate);
  const ensureCredits = useCreditsStore((s) => s.ensureCredits);
  const refreshCredits = useCreditsStore((s) => s.refreshInBackground);

  const hasMealPlan = useMealPlanStore((s) => s.plan !== null);
  const regenerateMealPlan = useMealPlanStore((s) => s.generate);
  const persona = usePersonaStore((s) => s.persona);
  const personaSaving = usePersonaStore((s) => s.saving);
  const choosePersona = usePersonaStore((s) => s.choose);
  const loadBadges = useBadgeStore((s) => s.load);
  const loadStrength = useStrengthStore((s) => s.loadOverview);

  const edit = useProfileEdit();
  const { deleting, confirm: handleDeleteAccount } = useDeleteAccount();

  const meUser: MeUser | null = me?.user ?? cachedUser;
  const entitlement: MeEntitlement | null = me?.entitlement ?? cachedEntitlement;
  // Server truth wins as a whole (fresh after every edit); local SQLite covers offline / first paint.
  const { profile, prefs } = useMemo(() => pickProfileSources(me, local), [me, local]);
  const view = useMemo(() => buildProfileView(profile, prefs), [profile, prefs]);

  const reloadLocal = useCallback(async () => {
    const [p, pl] = await Promise.all([getProfile(), getCurrentPlan()]);
    setLocal(p);
    setPlan(pl);
    setLocationId(toTrainingLocationId(p?.preferences?.trainingLocation ?? me?.preferences?.trainingLocation));
  }, [me?.preferences?.trainingLocation]);

  useEffect(() => {
    void (async () => {
      await Promise.all([hydrateMe(), hydrateCredits()]);
      await reloadLocal();
      refreshMe();
      refreshCredits();
      void ensureMe().catch(() => undefined);
      void ensureCredits().catch(() => undefined);
      void loadBadges();
    })();
  }, [ensureCredits, ensureMe, hydrateCredits, hydrateMe, loadBadges, refreshCredits, refreshMe, reloadLocal]);

  // Mirror server values into SQLite so the next offline first paint matches (no quiz defaults).
  useEffect(() => {
    if (!me?.profile && !me?.preferences) return;
    void patchLocalProfile({ ...(me.profile ?? {}), ...(me.preferences ?? {}) } as LocalProfilePatch).catch(() => undefined);
  }, [me?.profile, me?.preferences]);

  useEffect(() => {
    if (me?.preferences?.trainingLocation) setLocationId(toTrainingLocationId(me.preferences.trainingLocation));
  }, [me?.preferences?.trainingLocation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        reloadLocal(),
        ensureMe({ force: true }),
        ensureCredits({ force: true }),
        loadBadges(),
        loadStrength(),
        goalStore.getState().load(),
      ]);
    } catch {
      /* keep cache */
    } finally {
      setRefreshing(false);
    }
  }, [ensureCredits, ensureMe, loadBadges, loadStrength, reloadLocal]);

  const actions = useYouActions({ credits, creditsFetchedAt, onRefresh: () => void handleRefresh() });

  const handleEdit = (id: ProfileRowId) => {
    if (isSheetField(id)) setEditing(id);
    else setPrefsOpen(true);
  };

  const handlePrefsSaved = (saved: FoodPrefs) => {
    setPrefsOpen(false);
    edit.flagRebuild({ dietTags: saved.dietTags }, prefs);
    void ensureMe({ force: true }).catch(() => undefined);
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

  const handleSave = async (patch: Record<string, unknown>) => {
    const ok = await edit.save(patch);
    if (ok) void reloadLocal();
    return ok;
  };

  const goalNice = (prefs?.primaryGoal ?? "training").replace(/_/g, " ");
  const fallbackName = profile?.sex != null ? `Athlete · ${goalNice}` : "Mirra athlete";
  return (
    <ScreenScroll refreshing={refreshing} onRefresh={handleRefresh}>
      <ProfileCard
        user={meUser}
        entitlement={entitlement}
        fallbackName={fallbackName}
        fallbackMeta={profile ? `${experienceText(prefs?.experience)} · ${prefs?.sessionMinutes ?? 45} min sessions` : "Complete onboarding for profile"}
      />
      {/* S45 (AMI-182): goal card directly under the profile card, above the rank / strength tiles. */}
      <GoalTimelineCard style={{ marginTop: 16 }} />
      <YouTiles />
      <YouCreditsCard credits={credits} onPress={actions.creditsPress} />

      <PersonalDetailsRow onPress={() => setDetailsOpen(true)} />

      <YouTrainingCard
        plan={plan}
        rows={view.training}
        aboutDays={view.aboutDays}
        onEdit={handleEdit}
        locationId={locationId}
        locationSaving={locationSaving}
        onLocation={(id) => void handleLocation(id)}
      />
      {edit.rebuild === "training" ? <RebuildPrompt onDismiss={edit.dismissRebuild} /> : null}

      <RowsSection title={profileCopy.sections.nutrition} rows={view.nutrition} onEdit={handleEdit} />
      {edit.rebuild === "nutrition" ? <RebuildPrompt onDismiss={edit.dismissRebuild} /> : null}

      <YouCoachSection persona={persona} personaSaving={personaSaving} onChoosePersona={(id) => void handleChoosePersona(id)} />

      <YouFooterGroups
        subscriptionLine={subscriptionLabel(entitlement)}
        onManageSub={actions.manageSub}
        accountLabels={connectedAccountLabels(me?.accounts ?? cachedAccounts)}
        onPrivacy={actions.openPrivacy}
        onTerms={actions.openTerms}
        onSignOut={actions.signOut}
        onDeleteAccount={handleDeleteAccount}
        deleting={deleting}
      />
      <View style={{ height: DOCK_TAIL }} />

      <ProfileEditSheet
        field={editing}
        units={view.units}
        profile={profile}
        prefs={prefs}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />
      <PersonalDetailsSheet
        visible={detailsOpen}
        rows={view.body}
        units={view.units}
        profile={profile}
        prefs={prefs}
        onSave={handleSave}
        onClose={() => setDetailsOpen(false)}
      />
      <DietPrefsSheet visible={prefsOpen} onClose={() => setPrefsOpen(false)} onSaved={handlePrefsSaved} />
    </ScreenScroll>
  );
};
