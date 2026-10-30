import { router } from "expo-router";
import { Bell, ChevronLeft, ChevronRight, Footprints, Play, Plus, Zap } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { todayMock as m } from "./mock";

/** S15 Today home — lime focus banner, stats, start workout. */
export const TodayScreen = () => {
  const handleStart = () => router.push("/workout/live");
  const handleFuel = () => router.push("/(tabs)/fuel");

  return (
    <ScreenScroll>
      <View className="mb-space-lg flex-row items-center justify-between">
        <View className="flex-row items-center gap-space-sm">
          <View className="h-2.5 w-2.5 rounded-full bg-primary-fixed" />
          <Text className="font-headline-semi text-headline-sm uppercase text-on-surface">
            Today
          </Text>
        </View>
        <View className="flex-row gap-space-sm">
          <IconBtn label="Notifications" Icon={Bell} />
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high">
            <Text className="font-label-bold text-label-md text-primary-fixed">A</Text>
          </View>
        </View>
      </View>

      <View className="mb-space-md rounded-lg bg-surface-container-low p-space-md">
        <View className="mb-space-sm flex-row items-center justify-between">
          <View>
            <CapsLabel>{m.phase}</CapsLabel>
            <Text className="font-headline-sm text-headline-sm text-on-surface">{m.month}</Text>
          </View>
          <View className="flex-row gap-1 rounded-full bg-surface-container-high p-1">
            <IconBtn label="Previous week" Icon={ChevronLeft} small />
            <IconBtn label="Next week" Icon={ChevronRight} small />
          </View>
        </View>
        <View className="flex-row justify-between">
          {m.days.map((day) => (
            <View
              key={day.d}
              className={`h-9 w-9 items-center justify-center rounded-full ${
                day.active ? "bg-primary-fixed" : ""
              }`}
            >
              <Text
                className={`font-headline-sm text-headline-sm ${
                  day.active ? "text-on-primary-fixed" : "text-on-surface-variant"
                }`}
              >
                {day.d}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mb-space-md min-h-[148px] flex-row items-center justify-between overflow-hidden rounded-lg bg-primary-fixed p-space-lg">
        <View className="max-w-[62%] flex-col">
          <View className="mb-1.5 w-fit flex-row items-center gap-1 rounded-full bg-on-primary-fixed/10 px-2.5 py-0.5">
            <Zap size={14} color={color.onPrimaryFixed} />
            <CapsLabel tone="dark">Today&apos;s Focus</CapsLabel>
          </View>
          <Text className="font-headline text-headline-lg leading-tight text-on-primary-fixed">
            {m.focus.title}
          </Text>
          <Text className="mt-1 font-body-medium text-body-sm text-on-primary-fixed/85">
            {m.focus.subtitle}
          </Text>
        </View>
        <View className="h-28 w-28 items-end justify-end overflow-hidden rounded-full bg-on-primary-fixed/10">
          <Footprints size={48} color={color.onPrimaryFixed} style={{ opacity: 0.35, margin: 24 }} />
        </View>
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="min-h-[148px] flex-1 justify-between rounded-lg bg-secondary p-space-md">
          <CapsLabel tone="dark">Daily Motion</CapsLabel>
          <View>
            <Text className="font-display text-display-metric text-on-secondary-fixed">
              {m.steps.value}
            </Text>
            <Text className="font-body text-body-sm text-on-secondary-fixed">Steps taken</Text>
            <Text className="mt-1 font-label-bold text-label-md text-on-secondary-fixed">
              {m.steps.delta}
            </Text>
          </View>
        </View>
        <View className="min-h-[148px] flex-1 justify-between rounded-lg bg-surface-container-high p-space-md">
          <CapsLabel>Target Pace</CapsLabel>
          <View>
            <Text className="font-headline text-headline-md text-on-surface">{m.pace.label}</Text>
            <Text className="font-display text-display-metric text-primary-fixed">{m.pace.pct}</Text>
          </View>
          <View>
            <Text className="font-display text-headline-md text-on-surface">{m.kcal.value}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">Active kcal</Text>
            <View className="mt-1 self-start rounded-full bg-surface-container-highest px-2 py-0.5">
              <CapsLabel tone="lime">{m.kcal.tag}</CapsLabel>
            </View>
          </View>
        </View>
      </View>

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-high">
        <View className="p-space-md">
          <View className="mb-space-sm flex-row items-center justify-between">
            <CapsLabel>Today&apos;s Routine</CapsLabel>
            <Text className="font-body text-body-sm text-on-surface-variant">{m.routine.meta}</Text>
          </View>
          <Text className="font-headline-sm text-headline-sm text-on-surface">{m.routine.title}</Text>
          <Text className="mt-1 font-body text-body-md text-on-surface-variant">{m.routine.detail}</Text>
          <View className="mt-space-sm flex-row flex-wrap gap-space-xs">
            {m.routine.tags.map((t) => (
              <View key={t} className="rounded-full bg-surface-dim px-3 py-1">
                <CapsLabel tone="lime">{t}</CapsLabel>
              </View>
            ))}
          </View>
        </View>
        <View className="flex-row gap-space-sm px-space-md pb-space-md">
          <LimeCta
            label="Start Workout"
            onPress={handleStart}
            className="flex-1"
            icon={<Play size={18} color={color.onPrimaryFixed} fill={color.onPrimaryFixed} />}
          />
          <LimeCta label="Swap" onPress={() => undefined} variant="dark" className="px-space-md" />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open fuel"
        onPress={handleFuel}
        className="flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md"
      >
        <View>
          <Text className="font-headline-sm text-headline-sm text-on-surface">
            {m.fuel.logged} / {m.fuel.target}
          </Text>
          <Text className="font-body text-body-sm text-on-surface-variant">
            Calories logged · {m.fuel.remaining} kcal remaining
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-container-high">
          <Plus size={20} color={color.onSurface} />
        </View>
      </Pressable>
    </ScreenScroll>
  );
};

const IconBtn = ({
  label,
  Icon,
  small,
}: {
  label: string;
  Icon: typeof Bell;
  small?: boolean;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    className={`items-center justify-center rounded-full ${small ? "h-8 w-8" : "h-11 w-11"}`}
  >
    <Icon size={small ? 18 : 22} color={color.onSurface} />
  </Pressable>
);
