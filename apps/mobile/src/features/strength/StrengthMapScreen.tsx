import type { MuscleGroupId, MuscleId } from "@mirra/contracts";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { strengthCopy } from "@/content/strength";
import { AnatomyPair, type AnatomyMode } from "@/features/anatomy";
import { useProfileSex } from "@/features/exercise/body-map/use-profile-sex";
import { LogWeightSheet } from "@/features/progress/LogWeightSheet";
import { useWeightStore } from "@/features/progress/weight-store";
import { color, font, space } from "@/theme/tokens";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { MuscleDetailSheet } from "./MuscleDetailSheet";
import { MuscleGroupList } from "./MuscleGroupList";
import { OverallCard } from "./OverallCard";
import { StrengthSkeleton } from "./StrengthSkeleton";
import { useStrength } from "./strength-store";
import { StrengthTopBar } from "./StrengthTopBar";
import { groupRows, muscleForGroup, overallView, pickMuscle, tierSteps } from "./strength-view";

/** S34 figure stage height (pt). */
const FIGURE_HEIGHT = 360;

/** S34 Strength map: overall badge, Front/Back tier anatomy, muscle groups; tap → S35 sheet. */
export const StrengthMapScreen = () => {
  const insets = useSafeAreaInsets();
  const sex = useProfileSex();
  const { data, status, refresh } = useStrength();
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState<MuscleId | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const logWeight = useWeightStore((s) => s.logWeight);
  const weightSaving = useWeightStore((s) => s.logging);

  const steps = useMemo(() => (data ? tierSteps(data) : {}), [data]);
  const mode = useMemo<AnatomyMode>(() => ({ kind: "tier", steps }), [steps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onPressMuscle = useCallback(
    (ids: readonly MuscleId[]) => setOpenId(pickMuscle(ids, steps)),
    [steps],
  );
  const onPressGroup = useCallback((g: MuscleGroupId) => setOpenId(muscleForGroup(g, steps)), [steps]);

  const onSaveWeight = async (kg: number) => {
    if (await logWeight(kg)) {
      setWeightOpen(false);
      void refresh();
    }
  };

  const standing = openId ? data?.muscles.find((m) => m.id === openId)?.standing ?? null : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StrengthTopBar title={strengthCopy.headerTitle} />
      {!data && status === "error" ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{strengthCopy.errorTitle}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => void refresh()}>
            <Text style={styles.retry}>{strengthCopy.retry}</Text>
          </Pressable>
        </View>
      ) : !data ? (
        <StrengthSkeleton />
      ) : (
        <ScreenScroll refreshing={refreshing} onRefresh={onRefresh} dockPad={false} insetTop={false} style={styles.scroll}>
          <View style={styles.top}>
            <OverallCard view={overallView(data)} onAddWeight={() => setWeightOpen(true)} />
          </View>
          <AnatomyPair
            layout="toggle"
            sex={sex === "female" ? "female" : "male"}
            mode={mode}
            height={FIGURE_HEIGHT}
            onPressMuscle={onPressMuscle}
            style={styles.anatomy}
          />
          <MuscleGroupList
            rows={groupRows(data)}
            onPressGroup={onPressGroup}
            onAllTiers={() => router.push("/strength-ladder")}
          />
        </ScreenScroll>
      )}
      <MuscleDetailSheet muscleId={openId} standing={standing} onClose={() => setOpenId(null)} />
      <LogWeightSheet
        visible={weightOpen}
        saving={weightSaving}
        initialKg={null}
        onClose={() => setWeightOpen(false)}
        onSubmit={(kg) => void onSaveWeight(kg)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { backgroundColor: color.background },
  top: { marginTop: -space.lg },
  anatomy: { marginTop: space.lg },
  error: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm, paddingHorizontal: space.margin },
  errorText: { fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.onSurfaceVariant },
  retry: { fontFamily: font.bodySemi, fontSize: 14, lineHeight: 20, color: color.primaryContainer },
});
