import { router } from "expo-router";
import { ArrowLeft, ArrowRight, Share2, Trophy } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { rankCopy } from "@/content/rank";
import { useStreakStore } from "@/features/today/streak-store";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { useBadgeStore } from "./badge-store";
import { RankLadder } from "./RankLadder";
import { activeTier, titleForRank } from "./rank-meta";
import { StreakRankHero } from "./StreakRankHero";

/** Room under the scroll content for the sticky footer (milestone line + 56pt CTA). */
const FOOTER_CLEARANCE = 132;

/** S33 Kinetic Rank — streak hero + vertical badge ladder + sticky CTA. */
export const KineticRankScreen = () => {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const data = useBadgeStore((s) => s.data);
  const loadBadges = useBadgeStore((s) => s.load);
  const streak = useStreakStore((s) => s.checkIn);
  const loadStreak = useStreakStore((s) => s.load);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBadges(), loadStreak()]);
    setRefreshing(false);
  }, [loadBadges, loadStreak]);

  useEffect(() => {
    void loadBadges();
    void loadStreak();
  }, [loadBadges, loadStreak]);

  if (!data) {
    return (
      <View style={[sx("flex-1 items-center justify-center bg-surface-container-lowest"), { paddingTop: insets.top }]}>
        <ActivityIndicator color={color.primaryFixed} />
      </View>
    );
  }

  const active = activeTier(data.definitions, data.bestStreak);
  const currentTitle = titleForRank(data.definitions, data.currentRankId);

  return (
    <View style={[sx("flex-1 bg-surface-container-lowest"), { paddingTop: insets.top }]}>
      <View style={sx("h-14 flex-row items-center justify-between px-5")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={sx("h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low")}
        >
          <ArrowLeft size={20} color={color.onSurface} />
        </Pressable>
        <CapsLabel style={styles.onSurface}>{rankCopy.headerTitle}</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share rank"
          style={sx("h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low opacity-40")}
        >
          <Share2 size={18} color={color.onSurface} />
        </Pressable>
      </View>

      <ScreenScroll
        refreshing={refreshing}
        onRefresh={() => void refresh()}
        dockPad={false}
        insetTop={false}
        style={styles.scroll}
      >
        <View style={[sx("mb-6 gap-2"), styles.top]}>
          <View style={sx("flex-row items-center gap-2")}>
            <View style={sx("h-2 w-2 rounded-full bg-primary-fixed")} />
            <CapsLabel tone="lime">{rankCopy.eyebrow}</CapsLabel>
          </View>
          <Text style={sx("font-headline-lg text-headline-lg text-on-surface")}>{rankCopy.title}</Text>
          <Text style={sx("font-body text-body-lg text-on-surface-variant")}>{rankCopy.intro}</Text>
        </View>

        <StreakRankHero
          streakCurrent={streak?.current ?? 0}
          bestStreak={data.bestStreak}
          currentTitle={currentTitle}
          active={active}
        />

        <View style={sx("mb-4 mt-10 flex-row items-center justify-between")}>
          <Text style={sx("font-headline-md text-headline-md text-on-surface")}>{rankCopy.tiersTitle}</Text>
          <CapsLabel style={styles.onSurface}>{rankCopy.tiersCount(data.definitions.length)}</CapsLabel>
        </View>

        <RankLadder definitions={data.definitions} bestStreak={data.bestStreak} />
        <View style={{ height: FOOTER_CLEARANCE }} />
      </ScreenScroll>

      <View
        style={[
          sx("absolute bottom-0 left-0 right-0 border-t border-surface-container-high bg-surface-container-lowest px-4 pt-3"),
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <View style={sx("mb-3 flex-row items-center justify-center gap-2")}>
          <Trophy size={14} color={color.primaryFixed} />
          {active ? (
            <Text style={sx("font-label-bold text-label-md text-on-surface")}>
              {rankCopy.nextMilestone}
              <Text style={sx("text-primary-fixed")}>
                {rankCopy.nextMilestoneValue(active.def.title, active.def.thresholdDays)}
              </Text>
            </Text>
          ) : (
            <Text style={sx("font-label-bold text-label-md text-on-surface")}>{rankCopy.allUnlocked}</Text>
          )}
        </View>
        <LimeCta
          label={rankCopy.cta}
          icon={<ArrowRight size={20} color={color.onPrimaryFixed} />}
          onPress={() => router.replace("/(tabs)/today")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { backgroundColor: color.surfaceContainerLowest },
  top: { marginTop: -8 },
  onSurface: { color: color.onSurface },
});
