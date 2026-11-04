import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { s15bTodayCheckinInline } from "../../../assets/stitch";
import { unreadLabel } from "@/features/alerts/alert-meta";
import { KineticRankChip } from "@/features/rank/KineticRankChip";
import type { RankChipModel } from "@/features/rank/rank-meta";
import type { Streak } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CheckInPill } from "./CheckInPill";
import { StreakFireChip } from "./StreakFireChip";
import { TodayIconBtn } from "./TodayIconBtn";

/** Below this width the rank chip collapses to its glyph (S40). */
const COMPACT_WIDTH = 360;

type Props = {
  readonly onBell: () => void;
  /** Daily check-in is due: show the small pill under the chip row. */
  readonly checkInDue?: boolean;
  readonly onCheckIn?: () => void;
  /** Check-in streak; the fire chip renders once it has loaded. */
  readonly streak?: Streak | null;
  readonly onStreak?: () => void;
  /** Kinetic rank chip; renders once badges load (locked "Spark 0/7" or the earned title). */
  readonly rankChip?: RankChipModel | null;
  readonly onRank?: () => void;
  /** Unread in-app alerts; shows a lime count badge on the bell. */
  readonly unreadCount?: number;
};

/** S40 header: Today pill · spacer · rank chip · streak chip · bell · avatar → You. No microcopy. */
export const TodayHeader = ({
  onBell,
  checkInDue = false,
  onCheckIn,
  streak,
  onStreak,
  rankChip,
  onRank,
  unreadCount = 0,
}: Props) => {
  const { width } = useWindowDimensions();
  return (
    <View style={sx("mb-space-md")}>
      <View style={sx("h-14 flex-row items-center gap-1.5")}>
        <View style={sx("shrink-0 flex-row items-center gap-1 rounded-full bg-surface-container-high px-[10px] py-1.5")}>
          <View style={sx("h-1.5 w-1.5 rounded-full bg-primary-fixed")} />
          <Text style={sx("font-label-caps text-label-caps uppercase text-on-surface")}>Today</Text>
        </View>
        <View style={sx("min-w-0 flex-1")} />
        {rankChip ? <KineticRankChip chip={rankChip} compact={width < COMPACT_WIDTH} onPress={onRank} /> : null}
        {streak ? <StreakFireChip streak={streak} onPress={onStreak} /> : null}
        <View style={sx("h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high")}>
          <TodayIconBtn
            label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            Icon={Bell}
            small
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
          style={sx("shrink-0")}
        >
          <Image
            source={s15bTodayCheckinInline.avatar}
            accessibilityLabel="Your profile photo"
            style={styles.avatar}
            resizeMode="cover"
          />
        </Pressable>
      </View>
      {checkInDue && onCheckIn ? (
        <View style={sx("mt-1 flex-row")}>
          <CheckInPill onPress={onCheckIn} />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { top: -4, right: -4, minWidth: 18, height: 18 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: color.primaryFixed,
  },
});
