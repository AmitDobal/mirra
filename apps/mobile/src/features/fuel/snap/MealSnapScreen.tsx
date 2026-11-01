import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { StyleSheet, View } from "react-native";

import { color } from "@/theme/tokens";

import { AnalyzingView } from "./AnalyzingView";
import { DescribeView } from "./DescribeView";
import { FailView } from "./FailView";
import { ResultView } from "./ResultView";
import { useMealSnap, type SnapMode } from "./use-meal-snap";
import { selectLoggedKcal, useFuelStore } from "../fuel-store";
import { promptRebalanceIfOffPlan } from "../rebalance-prompt";

const toMode = (raw: string | string[] | undefined): SnapMode => {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "gallery" || v === "describe" ? v : "camera";
};

/** Cal AI–style meal snap: pick → analyzing → editable result → save. */
export const MealSnapScreen = () => {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const handleExit = useCallback(() => router.back(), []);
  const snap = useMealSnap(toMode(mode), handleExit);
  const target = useFuelStore((s) => s.target);
  const loggedKcal = useFuelStore((s) => selectLoggedKcal(s.meals));

  const handleSave = async () => {
    const kcal = await snap.save();
    if (kcal === null) return;
    // Land on Fuel (not the Log meal screen we may have come from).
    router.replace("/(tabs)/fuel");
    void promptRebalanceIfOffPlan(kcal);
  };
  const handleManual = () => router.replace("/(tabs)/log-meal");

  const { phase } = snap;
  return (
    <View style={styles.root}>
      {phase.name === "describe" ? (
        <DescribeView initial={snap.description} onSubmit={snap.describe} onClose={snap.cancel} />
      ) : null}
      {phase.name === "analyzing" ? (
        <AnalyzingView
          photoUri={snap.photo?.uri ?? null}
          targetKcal={target}
          onCancel={snap.cancel}
        />
      ) : null}
      {phase.name === "failed" ? (
        <FailView
          failure={phase.failure}
          onRetry={snap.retry}
          onDescribe={snap.retakeAsDescribe}
          onManual={handleManual}
          onClose={snap.cancel}
        />
      ) : null}
      {phase.name === "result" && snap.draft ? (
        <ResultView
          draft={snap.draft}
          onDraft={snap.setDraft}
          photoUri={snap.photo?.uri ?? null}
          description={snap.description}
          targetKcal={target}
          loggedKcal={loggedKcal}
          saving={snap.saving}
          saveError={snap.saveError}
          onSave={() => void handleSave()}
          onClose={snap.cancel}
          onRetake={snap.retake}
          onRefine={snap.refine}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.surface } });
