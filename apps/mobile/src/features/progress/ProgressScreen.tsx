import { router } from "expo-router";
import { Camera, ChevronRight, Lock } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";
import { useCoachStore } from "@/features/coach/coach-store";

import { useProgressStore } from "./progress-store";

/** S22 Progress gallery — SQLite photos + cache. */
export const ProgressScreen = () => {
  const photos = useProgressStore((s) => s.photos);
  const addPhoto = useProgressStore((s) => s.addPhoto);
  const hydratePhotos = useProgressStore((s) => s.hydrate);
  const weekLogged = useCoachStore((s) => s.weekLogged);
  const hydrateCoach = useCoachStore((s) => s.hydrate);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void hydratePhotos();
    void hydrateCoach();
  }, [hydratePhotos, hydrateCoach]);

  const handleCompare = () => router.push("/(tabs)/compare");

  const handleAdd = async () => {
    try {
      // Optional peer dep — Expo Go may not have it installed.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ImagePicker = require("expo-image-picker") as {
        requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
        launchImageLibraryAsync: (opts: {
          mediaTypes: string;
          quality: number;
        }) => Promise<{ canceled: boolean; assets?: { uri: string }[] }>;
      };
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.granted) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.7,
        });
        if (!result.canceled && result.assets?.[0]?.uri) {
          const entry = await addPhoto({ uri: result.assets[0].uri });
          setNote(`Added ${entry.label}`);
          return;
        }
      }
    } catch {
      // fall through
    }
    const entry = await addPhoto();
    setNote(`Saved · ${entry.label}`);
    Alert.alert("Photo saved", "On-device entry added.");
  };

  const latest = photos[0] ?? null;
  const prior = photos[1] ?? null;
  const checkInRate =
    photos.length > 0 ? `${Math.min(100, photos.length * 12)}%` : weekLogged ? `${weekLogged}` : "—";

  return (
    <ScreenScroll>
      <CapsLabel tone="lime">Progression Index</CapsLabel>
      <Text className="font-headline text-headline-lg text-on-surface">Progress Gallery</Text>
      <Text className="mb-space-md font-body text-body-md text-on-surface-variant">
        {photos.length ? `${photos.length} on-device photos` : "Add your first check-in photo"}
      </Text>

      {note ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setNote(null)}
          className="mb-space-sm self-start rounded-full bg-primary-fixed/20 px-3 py-1"
        >
          <CapsLabel tone="lime">{note}</CapsLabel>
        </Pressable>
      ) : null}

      <View className="mb-space-md overflow-hidden rounded-lg bg-surface-container-low p-space-md">
        <View className="mb-space-sm flex-row items-center justify-between">
          <CapsLabel>
            {photos.length >= 2 ? "Latest vs prior" : "Shape evolution"}
          </CapsLabel>
          <View className="flex-row items-center gap-1">
            <Lock size={12} color={color.onSurfaceVariant} />
            <CapsLabel>On-Device</CapsLabel>
          </View>
        </View>
        <View className="flex-row gap-space-sm">
          <PhotoSlot label="Baseline" sub={prior?.label ?? "Add a second photo"} uri={prior?.uri} />
          <PhotoSlot
            label="Current"
            sub={latest?.label ?? "No photo yet"}
            uri={latest?.uri}
            highlight
          />
        </View>
        <LimeCta
          label="Open Full Delta Biometric Split"
          onPress={handleCompare}
          className="mt-space-md"
        />
      </View>

      <View className="mb-space-md flex-row gap-space-sm">
        <Stat label="Photos" value={String(photos.length)} unit="saved" />
        <Stat label="Check-ins" value={String(weekLogged)} unit="recent" />
        <Stat label="Logging" value={checkInRate} unit="activity" />
      </View>

      <View className="mb-space-sm flex-row items-center justify-between">
        <Text className="font-headline-sm text-headline-sm text-on-surface">Biometric Chronology</Text>
        <CapsLabel>{photos.length} check-ins</CapsLabel>
      </View>

      {photos.length === 0 ? (
        <View className="mb-space-sm rounded-lg bg-surface-container-high p-space-md">
          <Text className="font-body text-body-md text-on-surface-variant">
            No progress photos yet. Add one to start comparing.
          </Text>
        </View>
      ) : (
        photos.map((e) => (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${e.label}`}
            onPress={handleCompare}
            className="mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md"
          >
            <View className="h-12 w-12 rounded-sm bg-surface-container-highest" />
            <View className="flex-1">
              <Text className="font-label text-label-md text-primary-fixed">{e.label}</Text>
              <Text className="font-body text-body-sm text-on-surface-variant">{e.note}</Text>
              <Text className="font-body-medium text-body-md text-on-surface">
                {e.kg} kg · {e.bf} BF · {e.pose}
              </Text>
            </View>
            <ChevronRight size={18} color={color.onSurfaceVariant} />
          </Pressable>
        ))
      )}

      <LimeCta
        label="Add photo"
        onPress={() => void handleAdd()}
        className="mt-space-sm"
        icon={<Camera size={18} color={color.onPrimaryFixed} />}
      />
    </ScreenScroll>
  );
};

const Stat = ({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) => (
  <View className="flex-1 rounded-lg bg-surface-container-high p-space-md">
    <CapsLabel>{label}</CapsLabel>
    <Text className="mt-1 font-display text-headline-md text-primary-fixed">{value}</Text>
    <Text className="font-body text-body-sm text-on-surface-variant">{unit}</Text>
  </View>
);

const PhotoSlot = ({
  label,
  sub,
  highlight,
  uri,
}: {
  label: string;
  sub: string;
  highlight?: boolean;
  uri?: string | null;
}) => (
  <View className="flex-1">
    <View
      className={`mb-space-xs h-40 items-center justify-center rounded-lg ${
        highlight
          ? "border border-primary-fixed bg-primary-fixed/20"
          : "bg-surface-container-highest"
      }`}
    >
      <Text className="font-label-bold text-label-lg text-on-surface-variant">
        {uri ? "Photo" : label}
      </Text>
    </View>
    <CapsLabel>{sub}</CapsLabel>
  </View>
);
