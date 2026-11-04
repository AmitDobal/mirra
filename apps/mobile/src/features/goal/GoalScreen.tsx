import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { goalCopy } from "@/content/goal";
import { profileCopy } from "@/content/profile";
import { LogWeightSheet } from "@/features/progress/LogWeightSheet";
import { useWeightStore } from "@/features/progress/weight-store";
import { ProfileEditSheet } from "@/features/you/ProfileEditSheet";
import type { EditableField } from "@/features/you/profile-fields";
import type { PrefsSource, ProfileSource } from "@/features/you/profile-format";
import { useProfileEdit } from "@/features/you/use-profile-edit";
import { useMeStore } from "@/stores/me-store";
import { color, font, radius, space, type } from "@/theme/tokens";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { goalStore } from "./goal-store";
import { GoalActions, GoalMilestones, GoalStayOnTrack } from "./GoalLists";
import { GoalChartCard, GoalHero, GoalStats, GoalTopBar } from "./GoalSections";
import { useGoalView } from "./use-goal-view";

const c = goalCopy.screen;

/**
 * S44 Goal timeline: hero ETA + status, chart (actual trend vs estimate band), stats,
 * milestones, "Stay on track", Log weight, Edit goal, restart in the overflow.
 * Data: `goal-store` (SWR + ETag); every goal input invalidates it, so numbers refresh in place.
 */
export const GoalScreen = () => {
  const { view, status, data, refresh } = useGoalView();
  const [refreshing, setRefreshing] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [editing, setEditing] = useState<EditableField | null>(null);
  const logWeight = useWeightStore((s) => s.logWeight);
  const weightSaving = useWeightStore((s) => s.logging);
  const lastKg = useWeightStore((s) => s.entries[0]?.kg ?? null);
  const me = useMeStore((s) => s.me);
  const edit = useProfileEdit();
  const profile = (me?.profile ?? null) as ProfileSource | null;
  const prefs = (me?.preferences ?? null) as PrefsSource | null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onSaveWeight = async (kg: number) => {
    // weight-store invalidates the goal after the API write; the screen updates in place.
    if (await logWeight(kg)) setWeightOpen(false);
  };

  const onEdit = () => {
    if (view.showSetGoal) {
      setEditing("goalWeightKg");
      return;
    }
    Alert.alert(c.editGoal, undefined, [
      { text: profileCopy.rows.goalWeightKg, onPress: () => setEditing("goalWeightKg") },
      { text: profileCopy.rows.pace, onPress: () => setEditing("pace") },
      { text: c.cancel, style: "cancel" },
    ]);
  };

  const doRestart = async () => {
    const out = await goalStore.getState().restart();
    if (out === "rate_limited") Alert.alert(c.restart, c.restartLimited);
    else if (out === "error") Alert.alert(c.restart, c.restartFailed);
  };

  const onMore = () =>
    Alert.alert(c.restartTitle, c.restartBody, [
      { text: c.cancel, style: "cancel" },
      { text: c.restartConfirm, onPress: () => void doRestart() },
    ]);

  const hasPlan = view.layout !== "empty";
  return (
    <View style={styles.root}>
      <ScreenScroll dockPad={false} refreshing={refreshing} onRefresh={onRefresh}>
        <GoalTopBar onMore={hasPlan ? onMore : null} />
        {!data && status === "loading" ? <GoalSkeleton /> : null}
        {!data && status === "error" ? <GoalMessage title={c.errorTitle} action={c.retry} onAction={() => void refresh()} /> : null}
        {data && !hasPlan ? <GoalMessage title={c.emptyTitle} body={c.emptyBody} /> : null}
        {hasPlan ? (
          <>
            <GoalHero view={view} />
            {view.chart ? <GoalChartCard chart={view.chart} /> : null}
            {view.stats ? <GoalStats stats={view.stats} /> : null}
            {view.milestones.length ? <GoalMilestones rows={view.milestones} /> : null}
            <GoalStayOnTrack rows={view.adherence} action={view.action} />
            <GoalActions
              onLogWeight={() => setWeightOpen(true)}
              onEdit={onEdit}
              editLabel={view.showSetGoal ? c.setGoal : c.editGoal}
            />
          </>
        ) : null}
      </ScreenScroll>
      <LogWeightSheet
        visible={weightOpen}
        saving={weightSaving}
        initialKg={lastKg ?? (data?.trendKg != null ? Math.round(data.trendKg * 10) / 10 : null)}
        onClose={() => setWeightOpen(false)}
        onSubmit={(kg) => void onSaveWeight(kg)}
      />
      <ProfileEditSheet
        field={editing}
        units={prefs?.units === "imperial" ? "imperial" : "metric"}
        profile={profile}
        prefs={prefs}
        onClose={() => setEditing(null)}
        onSave={edit.save}
      />
    </View>
  );
};

const GoalSkeleton = () => (
  <View accessible accessibilityLabel={goalCopy.card.loading} style={styles.skeleton}>
    <View style={[styles.block, { height: 96 }]} />
    <View style={[styles.block, { height: 260 }]} />
    <View style={[styles.block, { height: 88 }]} />
  </View>
);

type MessageProps = { readonly title: string; readonly body?: string; readonly action?: string; readonly onAction?: () => void };

const GoalMessage = ({ title, body, action, onAction }: MessageProps) => (
  <View style={styles.message}>
    <Text style={styles.messageTitle}>{title}</Text>
    {body ? <Text style={styles.messageBody}>{body}</Text> : null}
    {action && onAction ? (
      <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.retry}>
        <Text style={styles.retryText}>{action}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface },
  skeleton: { marginTop: space.md, gap: space.lg },
  block: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.surfaceContainerHigh,
    backgroundColor: color.surfaceContainerLow,
  },
  message: { marginTop: space.xl, gap: space.sm },
  messageTitle: {
    fontFamily: font.label,
    fontSize: type.headlineSm.size,
    lineHeight: type.headlineSm.line,
    color: color.onSurface,
  },
  messageBody: { fontFamily: font.body, fontSize: type.bodyMd.size, lineHeight: type.bodyMd.line, color: color.onSurfaceVariant },
  retry: { alignSelf: "flex-start", marginTop: space.sm },
  retryText: { fontFamily: font.labelBold, fontSize: type.labelLg.size, color: color.primaryFixed },
});
