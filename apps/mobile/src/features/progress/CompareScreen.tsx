import { router } from "expo-router";
import { ArrowLeft, Camera, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Image, Pressable, Share, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { useProgressStore } from "./progress-store";
import { sx } from "@/theme/sx";

/** S23 Mirror comparison — two latest photos. */
export const CompareScreen = () => {
  const photos = useProgressStore((s) => s.photos);
  const hydratePhotos = useProgressStore((s) => s.hydrate);
  const a = photos[0] ?? null;
  const b = photos[1] ?? null;

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void hydratePhotos();
  }, [hydratePhotos]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await hydratePhotos();
    } finally {
      setRefreshing(false);
    }
  }, [hydratePhotos]);

  const left = a ?? { label: "Current · add a photo", uri: null as string | null };
  const right = b ?? { label: "Baseline · add a photo", uri: null as string | null };

  const daysApart =
    a && b ? Math.round(Math.abs(a.takenAt - b.takenAt) / 86_400_000) : 0;

  const metrics =
    a && b
      ? [
          {
            label: "Time between",
            detail:
              daysApart === 0
                ? "Same day"
                : `${daysApart} ${daysApart === 1 ? "day" : "days"} apart`,
            value: daysApart === 0 ? "—" : `${daysApart}d`,
          },
        ]
      : [];

  const handleBack = () => router.back();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Mirra compare · ${left.label} vs ${right.label}`,
      });
    } catch {
      Alert.alert("Share", "Could not open share sheet.");
    }
  };

  return (
    <ScreenScroll
      dockPad={false}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleBack}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <ArrowLeft size={22} color={color.onSurface} />
        </Pressable>
        <CapsLabel>Review</CapsLabel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={() => void handleShare()}
          style={sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-high")}
        >
          <Share2 size={18} color={color.onSurface} />
        </Pressable>
      </View>

      <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
        {photos.length >= 2 ? "Latest two check-ins" : "Add two photos to compare"}
      </Text>
      <View style={sx("mb-space-md mt-space-sm flex-row gap-space-sm")}>
        <CompareSlot label={left.label} uri={left.uri} />
        <CompareSlot label={right.label} uri={right.uri} muted />
      </View>

      <CapsLabel style={sx("mb-space-sm")}>Summary</CapsLabel>
      {metrics.length === 0 ? (
        <Text style={sx("mb-space-sm font-body text-body-sm text-on-surface-variant")}>
          Add two photos to see time between check-ins.
        </Text>
      ) : (
        metrics.map((met) => (
          <View
            key={met.label}
            style={sx("mb-space-sm flex-row items-center justify-between rounded-lg bg-surface-container-low p-space-md")}
          >
            <View style={sx("flex-1 pr-space-sm")}>
              <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{met.label}</Text>
              <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{met.detail}</Text>
            </View>
            <Text style={sx("font-display text-headline-md text-primary-fixed")}>{met.value}</Text>
          </View>
        ))
      )}

      {a && b ? <LimeCta label="Share side-by-side" onPress={() => void handleShare()} /> : null}
    </ScreenScroll>
  );
};

const CompareSlot = ({
  label,
  uri,
  muted,
}: {
  label: string;
  uri: string | null;
  muted?: boolean;
}) => (
  <View
    style={sx(
      `h-56 flex-1 overflow-hidden rounded-lg ${
        muted ? "bg-surface-container-high" : "bg-surface-container-highest"
      }`,
    )}
  >
    {uri ? (
      <Image
        source={{ uri }}
        accessibilityLabel={label}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
      />
    ) : (
      <View style={sx("h-full w-full items-center justify-center bg-surface-container-highest")}>
        <Camera size={28} color={color.onSurfaceVariant} />
        <Text style={sx("mt-2 font-body text-body-sm text-on-surface-variant")}>No photo</Text>
      </View>
    )}
  </View>
);
