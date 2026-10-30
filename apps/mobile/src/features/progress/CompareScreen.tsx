import { router } from "expo-router";
import { ArrowLeft, Share2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { useProgressStore } from "./progress-store";

const VIEWS = ["Front View", "Side Profile", "Back Lat"] as const;

/** S23 Mirror comparison — two latest photos. */
export const CompareScreen = () => {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Front View");
  const photos = useProgressStore((s) => s.photos);
  const hydratePhotos = useProgressStore((s) => s.hydrate);
  const a = photos[0] ?? null;
  const b = photos[1] ?? null;

  useEffect(() => {
    void hydratePhotos();
  }, [hydratePhotos]);

  const left = a ?? { label: "Current · add a photo", uri: null as string | null };
  const right = b ?? { label: "Baseline · add a photo", uri: null as string | null };

  const daysDelta =
    a && b
      ? `${Math.max(1, Math.round((a.takenAt - b.takenAt) / 86_400_000))} days apart`
      : "Need two photos";

  const metrics = [
    {
      label: "Pose pair",
      detail: `${a?.pose ?? "—"} vs ${b?.pose ?? "—"}`,
      value: photos.length >= 2 ? "Ready" : "Wait",
      tag: view,
    },
    {
      label: "Time delta",
      detail: daysDelta,
      value: String(photos.length),
      tag: "Photos",
    },
    {
      label: "Notes",
      detail: a?.note ?? "No notes yet",
      value: b ? "2+" : "0–1",
      tag: "Compare",
    },
  ];

  const handleBack = () => router.back();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mirra compare · ${left.label} vs ${right.label} (${view})`,
      });
    } catch {
      Alert.alert("Share", "Could not open share sheet.");
    }
  };

  return (
    <ScreenScroll dockPad={false}>
      <View className="mb-space-md flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <ArrowLeft size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel>Inspection Modal</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={() => void handleShare()}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface-container-high"
        >
          <Share2 size={18} color={color.onSurface} />
        </Pressable>
      </View>

      <Text className="font-headline-sm text-headline-sm text-on-surface">
        {photos.length >= 2 ? "Latest two check-ins" : "Add two photos to compare"}
      </Text>
      <CapsLabel tone="lime" className="mt-1">
        {view}
      </CapsLabel>

      <View className="my-space-md flex-row gap-space-xs">
        {VIEWS.map((v) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            accessibilityState={{ selected: view === v }}
            onPress={() => setView(v)}
            className={`flex-1 items-center rounded-full py-2 ${
              view === v ? "bg-primary-fixed" : "bg-surface-container-high"
            }`}
          >
            <Text
              className={`font-label text-label-md ${
                view === v ? "text-on-primary-fixed" : "text-on-surface-variant"
              }`}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <View className="h-56 flex-1 items-center justify-center rounded-lg bg-surface-container-highest">
          <CapsLabel>{left.label}</CapsLabel>
          <Text className="mt-2 font-body text-body-sm text-on-surface-variant">
            {left.uri ? "Photo attached" : "Placeholder"}
          </Text>
        </View>
        <View className="h-56 flex-1 items-center justify-center rounded-lg bg-surface-container-high">
          <CapsLabel>{right.label}</CapsLabel>
          <Text className="mt-2 font-body text-body-sm text-on-surface-variant">
            {right.uri ? "Photo attached" : "Placeholder"}
          </Text>
        </View>
      </View>

      <CapsLabel className="mb-space-sm">Compare summary</CapsLabel>
      {metrics.map((met) => (
        <View
          key={met.label}
          className="mb-space-sm flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md"
        >
          <View className="flex-1 pr-space-sm">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{met.label}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{met.detail}</Text>
          </View>
          <View className="items-end">
            <Text className="font-display text-headline-md text-primary-fixed">{met.value}</Text>
            <CapsLabel>{met.tag}</CapsLabel>
          </View>
        </View>
      ))}

      <LimeCta label="Export Side-by-Side" onPress={() => void handleShare()} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare different dates"
        onPress={handleBack}
        className="mt-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-on-surface-variant">
          Compare Different Dates
        </Text>
      </Pressable>
    </ScreenScroll>
  );
};
