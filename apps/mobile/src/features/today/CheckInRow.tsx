import { ArrowRight, Check } from "lucide-react-native";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { s15bTodayCheckinInline } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { pressFeedback } from "./press-style";

type Props = {
  readonly due: boolean;
  readonly onPress: () => void;
};

/** S15B full-width "How are you today?" row: avatar + Energy · Sleep · Soreness + 3 taps. */
export const CheckInRow = ({ due, onPress }: Props) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={due ? "How are you today? Open check-in" : "Check-in done. Review check-in"}
    onPress={onPress}
    style={({ pressed }) => [
      sx("mb-space-md flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md"),
      pressFeedback(pressed),
    ]}
  >
    <Image
      source={s15bTodayCheckinInline.avatar}
      accessibilityLabel="Your check-in portrait"
      style={styles.avatar}
      resizeMode="cover"
    />
    <View style={sx("min-w-0 flex-1")}>
      <Text style={sx("font-headline-semi text-headline-sm text-on-surface")} numberOfLines={1}>
        {due ? "How are you today?" : "Checked in today"}
      </Text>
      <Text style={sx("font-body text-body-sm text-on-surface-variant")} numberOfLines={1}>
        Energy · Sleep · Soreness
      </Text>
    </View>
    <View style={sx("flex-row items-center gap-1 rounded-full bg-primary-fixed px-3 py-1.5")}>
      <Text style={sx("font-label-bold text-label-md text-on-primary-fixed")}>
        {due ? "3 taps" : "Done"}
      </Text>
      {due ? (
        <ArrowRight size={14} color={color.onPrimaryFixed} />
      ) : (
        <Check size={14} color={color.onPrimaryFixed} />
      )}
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: color.primaryFixed,
  },
});
