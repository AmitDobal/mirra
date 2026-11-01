import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { s15bTodayCheckinInline } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { TodayIconBtn } from "./TodayIconBtn";

type Props = {
  readonly onBell: () => void;
};

/** S15B header: Today pill + "Rest counts." microcopy, bell, avatar → You. */
export const TodayHeader = ({ onBell }: Props) => (
  <View style={sx("mb-space-lg flex-row items-center justify-between gap-space-sm")}>
    <View style={sx("min-w-0 flex-1 flex-row items-center gap-space-sm")}>
      <View style={sx("shrink-0 flex-row items-center gap-space-sm rounded-full bg-surface-container-high px-3 py-1.5")}>
        <View style={sx("h-2 w-2 shrink-0 rounded-full bg-primary-fixed")} />
        <Text style={sx("font-headline-semi text-label-md uppercase text-on-surface")}>Today</Text>
      </View>
      <Text style={sx("min-w-0 flex-1 font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
        Rest counts.
      </Text>
    </View>
    <View style={sx("flex-row items-center gap-space-sm")}>
      <TodayIconBtn label="Notifications" Icon={Bell} onPress={onBell} />
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: color.primaryFixed,
  },
});
