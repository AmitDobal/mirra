import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { s15bTodayCheckinInline } from "../../../assets/stitch";
import { unreadLabel } from "@/features/alerts/alert-meta";
import type { Streak } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CheckInPill } from "./CheckInPill";
import { KineticRankChip } from "@/features/rank/KineticRankChip";
import { StreakFireChip } from "./StreakFireChip";
import { TodayIconBtn } from "./TodayIconBtn";

type Props = {
  readonly onBell: () => void;
  /** Daily check-in is due: show the small pill. */
  readonly checkInDue?: boolean;
  readonly onCheckIn?: () => void;
  /** Check-in streak; the crimson fire chip renders once it has loaded. */
  readonly streak?: Streak | null;
  readonly onStreak?: () => void;
  readonly rankTitle?: string | null;
  readonly onRank?: () => void;
  /** Unread in-app alerts; shows a lime count badge on the bell. */
  readonly unreadCount?: number;
};

/** S15c header: Today pill + microcopy (or check-in pill when due), streak fire, bell, avatar → You. */
export const TodayHeader = ({
  onBell,
  checkInDue = false,
  onCheckIn,
  streak,
  onStreak,
  rankTitle,
  onRank,
  unreadCount = 0,
}: Props) => (
  <View style={sx("mb-space-md flex-row items-center justify-between gap-space-sm")}>
    <View style={sx("min-w-0 flex-1 flex-row items-center gap-space-sm")}>
      <View style={sx("shrink-0 flex-row items-center gap-space-sm rounded-full bg-surface-container-high px-3 py-1.5")}>
        <View style={sx("h-2 w-2 shrink-0 rounded-full bg-primary-fixed")} />
        <Text style={sx("font-headline-semi text-label-md uppercase text-on-surface")}>Today</Text>
      </View>
      {checkInDue && onCheckIn ? (
        <CheckInPill onPress={onCheckIn} />
      ) : (
        <Text style={sx("min-w-0 flex-1 font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
          Rest counts.
        </Text>
      )}
    </View>
    <View style={sx("flex-row items-center gap-space-sm")}>
      {rankTitle ? <KineticRankChip title={rankTitle} onPress={onRank} /> : null}
      {streak ? <StreakFireChip streak={streak} onPress={onStreak} /> : null}
      <View>
        <TodayIconBtn
          label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
          Icon={Bell}
          onPress={onBell}
        />
        {unreadCount > 0 ? (
          <View
            pointerEvents="none"
            style={[sx("absolute items-center justify-center rounded-full bg-primary-fixed px-1"), styles.badge]}
          >
            <Text style={sx("font-label-bold text-label-caps text-on-primary-fixed")}>
              {unreadLabel(unreadCount)}
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        onPress={() => router.push("/(tabs)/you")}
      >
        <Image
          source={s15bTodayCheckinInline.avatar}
          accessibilityLabel="Your profile photo"
          style={styles.avatar}
          resizeMode="cover"
        />
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  badge: { top: 2, right: 0, minWidth: 18, height: 18 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: color.primaryFixed,
  },
});
