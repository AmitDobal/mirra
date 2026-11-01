import { router } from "expo-router";
import { BarChart3, Camera, ChevronRight, Lock } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { color, space } from "@/theme/tokens";
import { getTodayInsights } from "@/lib/api";

import { useProgressStore, type ProgressPhoto } from "./progress-store";
import { PhotoSlot, Stat } from "./ProgressParts";
import { WeightJourneyCard } from "./WeightJourneyCard";
import { sx } from "@/theme/sx";

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Distinct check-in days in the loaded page (honest, not fabricated). */
const streakishDays = (photos: readonly ProgressPhoto[]): number => {
  const keys = [...new Set(photos.map((p) => dayKey(p.takenAt)))].sort().reverse();
  if (keys.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < keys.length; i += 1) {
    const prev = new Date(`${keys[i - 1]}T12:00:00Z`).getTime();
    const cur = new Date(`${keys[i]}T12:00:00Z`).getTime();
    if (Math.round((prev - cur) / 86_400_000) === 1) streak += 1;
    else break;
  }
  return streak;
};

/** S22 Progress gallery — API-backed, page size 10, empty CTA (no stock Stitch). */
export const ProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const photos = useProgressStore((s) => s.photos);
  const hasMore = useProgressStore((s) => s.nextCursor !== null);
  const loadingMore = useProgressStore((s) => s.loadingMore);
  const loadMore = useProgressStore((s) => s.loadMore);
  const addPhoto = useProgressStore((s) => s.addPhoto);
  const hydratePhotos = useProgressStore((s) => s.hydrate);
  const [note, setNote] = useState<string | null>(null);
  const [weekSessions, setWeekSessions] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = useCallback(async () => {
    try {
      const i = await getTodayInsights();
      setWeekSessions(i.training.sessionsThisWeek);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void hydratePhotos();
    void loadInsights();
  }, [hydratePhotos, loadInsights]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([hydratePhotos(), loadInsights()]);
    } finally {
      setRefreshing(false);
    }
  }, [hydratePhotos, loadInsights]);

  const handleCompare = () => router.push("/(tabs)/compare");

  const handleEndReached = useCallback(() => {
    void loadMore();
  }, [loadMore]);

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
    Alert.alert("Photo saved", "On-device entry added. Sync when online.");
  };

  const latest = photos[0] ?? null;
  const prior = photos[1] ?? null;
  const photoStreak = useMemo(() => streakishDays(photos), [photos]);
  const latestDate = latest
    ? new Date(latest.takenAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "—";

  const renderPhoto = ({ item: e }: { item: ProgressPhoto }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${e.label}`}
      onPress={handleCompare}
      style={sx(
        "mb-space-sm flex-row items-center gap-space-md rounded-lg bg-surface-container-high p-space-md",
      )}
    >
      {e.uri ? (
        <Image
          source={{ uri: e.uri }}
          accessibilityLabel={e.label}
          style={{ width: 56, height: 72, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            sx("items-center justify-center rounded-lg bg-surface-container-highest"),
            { width: 56, height: 72 },
          ]}
        >
          <Camera size={20} color={color.onSurfaceVariant} />
        </View>
      )}
      <View style={sx("flex-1")}>
        <Text style={sx("font-label text-label-md text-primary-fixed")}>{e.label}</Text>
        <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{e.note}</Text>
        <Text style={sx("font-body-medium text-body-md text-on-surface")}>
          {new Date(e.takenAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </Text>
      </View>
      <ChevronRight size={18} color={color.onSurfaceVariant} />
    </Pressable>
  );

  const count = `${photos.length}${hasMore ? "+" : ""}`;

  const header = (
    <View>
      <CapsLabel tone="lime">Microcycle</CapsLabel>
      <Text style={sx("font-headline text-headline-lg text-on-surface")}>
        Progress Gallery
      </Text>
      <Text style={sx("mb-space-md font-body text-body-md text-on-surface-variant")}>
        {photos.length
          ? `${count} check-ins · synced when online`
          : "Add your first check-in photo"}
      </Text>

      {note ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setNote(null)}
          style={sx("mb-space-sm self-start rounded-full bg-primary-fixed/20 px-3 py-1")}
        >
          <CapsLabel tone="lime">{note}</CapsLabel>
        </Pressable>
      ) : null}

      <View style={sx("mb-space-md overflow-hidden rounded-lg bg-surface-container-low p-space-md")}>
        <View style={sx("mb-space-sm flex-row items-center justify-between")}>
          <CapsLabel>
            {photos.length >= 2 ? "Latest vs prior" : "Shape evolution"}
          </CapsLabel>
          <View style={sx("flex-row items-center gap-1")}>
            <Lock size={12} color={color.onSurfaceVariant} />
            <CapsLabel>Private</CapsLabel>
          </View>
        </View>
        <View style={sx("flex-row gap-space-sm")}>
          <PhotoSlot
            label="Baseline"
            sub={prior?.label ?? "Add a second photo"}
            uri={prior?.uri}
          />
          <PhotoSlot
            label="Current"
            sub={latest?.label ?? "No photo yet"}
            uri={latest?.uri}
            highlight
          />
        </View>
        <LimeCta
          label={photos.length >= 2 ? "Compare your photos" : "Add photo"}
          onPress={photos.length >= 2 ? handleCompare : () => void handleAdd()}
          style={sx("mt-space-md")}
        />
      </View>

      <WeightJourneyCard />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open calorie and workout history"
        onPress={() => router.push("/(tabs)/history")}
        style={sx(
          "mb-space-md flex-row items-center gap-space-md rounded-lg bg-surface-container-low p-space-md",
        )}
      >
        <BarChart3 size={22} color={color.primaryFixed} />
        <View style={sx("flex-1")}>
          <Text style={sx("font-label text-label-lg text-on-surface")}>Calories &amp; training history</Text>
          <Text style={sx("font-body text-body-sm text-on-surface-variant")}>
            Day, week and month charts
          </Text>
        </View>
        <ChevronRight size={18} color={color.onSurfaceVariant} />
      </Pressable>

      <View style={sx("mb-space-md flex-row gap-space-sm")}>
        <Stat label="Photos" value={count} unit="saved" />
        <Stat label="Latest" value={latestDate} unit="check-in" />
        <Stat
          label="Streak"
          value={String(photoStreak || weekSessions)}
          unit={photoStreak ? "photo days" : "sessions / wk"}
        />
      </View>

      <View style={sx("mb-space-sm flex-row items-center justify-between")}>
        <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>
          Check-in history
        </Text>
        <CapsLabel>{count} check-ins</CapsLabel>
      </View>
    </View>
  );

  const footer = (
    <View>
      {loadingMore ? (
        <ActivityIndicator color={color.primaryFixed} style={sx("my-space-md")} />
      ) : null}
      <LimeCta
        label="Add photo"
        onPress={() => void handleAdd()}
        style={sx("mt-space-sm")}
        icon={<Camera size={18} color={color.onPrimaryFixed} />}
      />
    </View>
  );

  return (
    <FlatList
      data={photos}
      keyExtractor={(p) => p.id}
      renderItem={renderPhoto}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={
        <View style={sx("mb-space-sm rounded-lg bg-surface-container-high p-space-md")}>
          <Text style={sx("mb-space-sm font-body text-body-md text-on-surface-variant")}>
            No progress photos yet. Add one to start comparing across devices.
          </Text>
          <LimeCta label="Add your first photo" onPress={() => void handleAdd()} />
        </View>
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      initialNumToRender={10}
      windowSize={7}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: color.surface }}
      contentContainerStyle={{
        paddingTop: insets.top + space.lg,
        paddingBottom: space.dockClearance + insets.bottom,
        paddingHorizontal: space.margin,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void handleRefresh();
          }}
          tintColor={color.primaryFixed}
          colors={[color.primaryFixed]}
          progressBackgroundColor={color.surfaceContainerHigh}
        />
      }
    />
  );
};
