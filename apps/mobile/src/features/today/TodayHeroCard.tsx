import { router } from "expo-router";
import { ArrowUpRight, Play, Zap } from "lucide-react-native";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";

import { s15Today } from "../../../assets/stitch";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { heroLayout } from "./hero-layout";
import { pressFeedback } from "./press-style";

type Props = {
  readonly title: string;
  readonly focus: string | null;
  readonly minutes: number;
  readonly hasWorkout: boolean;
  readonly onStart: () => void;
  readonly onSwap: () => void;
};

/** Start Workout + Swap pills. `wide` = full card width under the title (narrow phones). */
type ActionsProps = Pick<Props, "hasWorkout" | "onStart" | "onSwap"> & { readonly wide: boolean };

const HeroActions = ({ hasWorkout, onStart, onSwap, wide }: ActionsProps) => (
  <View style={sx(`flex-row items-center gap-space-sm ${wide ? "mt-space-md" : ""}`)}>
    {hasWorkout ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start workout"
        onPress={onStart}
        style={({ pressed }) => [
          sx("h-11 min-w-0 flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-on-primary-fixed px-3"),
          pressFeedback(pressed),
        ]}
      >
        <Text style={sx("font-label-bold text-label-lg text-primary-fixed")} numberOfLines={1}>
          Start Workout
        </Text>
        <Play size={14} color={color.primaryFixed} fill={color.primaryFixed} />
      </Pressable>
    ) : null}
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Swap today's workout"
      onPress={onSwap}
      style={({ pressed }) => [
        sx("h-11 items-center justify-center rounded-full bg-on-primary-fixed/10 px-space-md"),
        pressFeedback(pressed),
      ]}
    >
      <Text style={sx("font-label-bold text-label-lg text-on-primary-fixed")}>Swap</Text>
    </Pressable>
  </View>
);

/** S15c lime Today's Focus hero: title, one line, Start / Swap, portrait photo + minutes badge. */
export const TodayHeroCard = ({ title, focus, minutes, hasWorkout, onStart, onSwap }: Props) => {
  const { width } = useWindowDimensions();
  const layout = heroLayout(width);
  const actions = (
    <HeroActions hasWorkout={hasWorkout} onStart={onStart} onSwap={onSwap} wide={layout.compact} />
  );
  return (
    <View style={sx("mb-space-sm overflow-hidden rounded-lg bg-primary-fixed p-space-md")}>
      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-1 rounded-full bg-on-primary-fixed px-2.5 py-1")}>
          <Zap size={12} color={color.primaryFixed} fill={color.primaryFixed} />
          <CapsLabel tone="lime">Today&apos;s Focus</CapsLabel>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Why this workout? Ask the coach"
          onPress={() => router.push("/(tabs)/plan-chat")}
          style={sx("flex-row items-center gap-1")}
        >
          <CapsLabel tone="dark">Why? AI rationale</CapsLabel>
          <ArrowUpRight size={14} color={color.onPrimaryFixed} />
        </Pressable>
      </View>
      <View style={sx("flex-row items-center gap-space-md")}>
        <View style={sx("min-w-0 flex-1 gap-space-sm")}>
          <Text
            style={sx("font-headline text-headline-lg text-on-primary-fixed")}
            numberOfLines={layout.compact ? 3 : 2}
            adjustsFontSizeToFit={layout.compact}
            minimumFontScale={0.8}
          >
            {title}
          </Text>
          <Text style={sx("font-body-medium text-body-sm text-on-primary-fixed/85")} numberOfLines={1}>
            {focus ?? "Recovery focus"}
          </Text>
          {layout.compact ? null : actions}
        </View>
        <View
          style={[
            sx("overflow-hidden rounded-lg bg-on-primary-fixed"),
            { width: layout.photoW, height: layout.photoH },
          ]}
        >
          <Image
            source={s15Today.trainerSquat}
            accessibilityLabel="Today's focus"
            style={{ width: layout.photoW, height: layout.photoH }}
            resizeMode="cover"
          />
          {minutes > 0 ? (
            <View
              style={[
                sx("rounded-full bg-surface-dim/80 px-2 py-0.5"),
                { position: "absolute", right: 6, bottom: 6 },
              ]}
            >
              <Text style={sx("font-label-bold text-label-md text-on-surface")}>{minutes}m</Text>
            </View>
          ) : null}
        </View>
      </View>
      {layout.compact ? actions : null}
    </View>
  );
};
