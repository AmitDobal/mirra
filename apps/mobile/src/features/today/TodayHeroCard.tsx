import { router } from "expo-router";
import { ArrowUpRight, Zap } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { s15Today } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly title: string;
  readonly focus: string | null;
};

/** S15 lime hero, tightened: title + one line + "Why?". */
export const TodayHeroCard = ({ title, focus }: Props) => (
  <View
    style={sx(
      "mb-space-md min-h-[148px] flex-row items-center justify-between overflow-hidden rounded-lg bg-primary-fixed p-space-lg",
    )}
  >
    <View style={sx("max-w-[62%] flex-1 flex-col gap-space-sm")}>
      <View style={sx("self-start flex-row items-center gap-1 rounded-full bg-on-primary-fixed/10 px-2.5 py-1")}>
        <Zap size={14} color={color.onPrimaryFixed} />
        <CapsLabel tone="dark">Today&apos;s Focus</CapsLabel>
      </View>
      <Text style={sx("font-headline text-headline-lg text-on-primary-fixed")} numberOfLines={2}>
        {title}
      </Text>
      <Text
        style={sx("font-body-medium text-body-sm text-on-primary-fixed/85")}
        numberOfLines={1}
      >
        {focus ?? "Recovery focus"}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Why this workout? Ask the coach"
        onPress={() => router.push("/(tabs)/plan-chat")}
        style={sx("self-start flex-row items-center gap-1")}
      >
        <CapsLabel tone="dark">Why?</CapsLabel>
        <ArrowUpRight size={14} color={color.onPrimaryFixed} />
      </Pressable>
    </View>
    <Image
      source={s15Today.athleteMidMotion}
      accessibilityLabel="Today focus"
      style={{ width: 112, height: 112, borderRadius: 56 }}
      resizeMode="cover"
    />
  </View>
);
