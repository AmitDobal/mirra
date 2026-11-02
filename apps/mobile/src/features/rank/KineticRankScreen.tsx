import { router } from "expo-router";
import { ArrowLeft, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useStreakStore } from "@/features/today/streak-store";
import type { BadgeDefinition } from "@/lib/api/badges";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";

import { useBadgeStore } from "./badge-store";
import { progressToNext, titleForRank, unlockedSet } from "./rank-meta";
import { RankTierRow } from "./RankTierRow";
import { StreakRankHero } from "./StreakRankHero";

const tierState = (
  def: BadgeDefinition,
  unlocked: Set<string>,
  currentRankId: string | null,
  nextRankId: string | null,
): "locked" | "unlocked" | "current" | "next" => {
  if (def.id === currentRankId) return "current";
  if (unlocked.has(def.id)) return "unlocked";
  if (def.id === nextRankId) return "next";
  return "locked";
};

/** S33 Kinetic Rank — streak hero + vertical badge ladder. */
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
    void refresh();
  }, [refresh]);

  const unlocked = useMemo(() => unlockedSet(data?.unlocked ?? []), [data?.unlocked]);
  const currentTitle = titleForRank(data?.definitions ?? [], data?.currentRankId ?? null);
  const nextDef = data?.definitions.find((d) => d.id === data.nextRankId);
  const progress = data ? progressToNext(data.bestStreak, nextDef) : null;

  if (!data) {
    return (
      <View style={[sx("flex-1 items-center justify-center bg-surface-container-lowest"), { paddingTop: insets.top }]}>
        <ActivityIndicator color={color.primaryFixed} />
      </View>
    );
  }

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
        <CapsLabel tone="muted">Rank progression</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share rank"
          style={sx("h-10 w-10 items-center justify-center rounded-full border border-outline-variant/40 bg-surface-container-low opacity-40")}
        >
          <Share2 size={18} color={color.onSurface} />
        </Pressable>
      </View>

      <ScreenScroll refreshing={refreshing} onRefresh={() => void refresh()} dockPad={false}>
        <View style={sx("px-5 pb-32")}>
        <View style={sx("mb-space-md gap-1.5")}>
          <View style={sx("flex-row items-center gap-2")}>
            <View style={sx("h-2 w-2 rounded-full bg-primary-fixed")} />
            <CapsLabel tone="lime">Performance ladder</CapsLabel>
          </View>
          <Text style={sx("font-headline-lg text-headline-lg text-on-surface")}>Kinetic Rank</Text>
          <Text style={sx("font-body-md text-body-md text-on-surface-variant")}>
            Consistent microcycles forge momentum. Unlock tiers by locking daily adherence.
          </Text>
        </View>

        <StreakRankHero
          streakCurrent={streak?.current ?? 0}
          bestStreak={data.bestStreak}
          currentTitle={currentTitle}
          progress={progress}
          nextTitle={nextDef?.title ?? null}
        />

        <View style={sx("mb-space-sm mt-space-md flex-row items-center justify-between")}>
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>Milestone tiers</Text>
          <CapsLabel tone="muted">5 tiers</CapsLabel>
        </View>

        {data.definitions.map((def) => (
          <RankTierRow
            key={def.id}
            def={def}
            bestStreak={data.bestStreak}
            state={tierState(def, unlocked, data.currentRankId, data.nextRankId)}
          />
        ))}
        </View>
      </ScreenScroll>

      <View
        style={[
          sx("absolute bottom-0 left-0 right-0 border-t border-surface-container-high bg-surface-container-lowest/95 px-4 pt-3"),
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {nextDef ? (
          <Text style={sx("mb-2 text-center font-label-caps text-label-caps text-on-surface-variant")}>
            Next milestone · {nextDef.title} ({nextDef.thresholdDays}d)
          </Text>
        ) : null}
        <LimeCta label="Keep streak active today" onPress={() => router.replace("/(tabs)/today")} />
      </View>
    </View>
  );
};
