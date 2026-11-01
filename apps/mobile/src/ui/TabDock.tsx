import { router, usePathname, type Href } from "expo-router";
import {
  Flame,
  Home,
  LineChart,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { copy } from "@/content/copy";
import { color, radius, shadow, space } from "@/theme/tokens";

type TabId = "today" | "fuel" | "coach" | "progress" | "you";

type TabDef = {
  id: TabId;
  label: string;
  href: Href;
  Icon: LucideIcon;
};

const tabs: TabDef[] = [
  { id: "today", label: copy.tabs.today, href: "/(tabs)/today", Icon: Home },
  { id: "fuel", label: copy.tabs.fuel, href: "/(tabs)/fuel", Icon: Flame },
  { id: "coach", label: copy.tabs.coach, href: "/(tabs)/coach", Icon: Zap },
  {
    id: "progress",
    label: copy.tabs.progress,
    href: "/(tabs)/progress",
    Icon: LineChart,
  },
  { id: "you", label: copy.tabs.you, href: "/(tabs)/you", Icon: User },
];

const activeTab = (path: string): TabId => {
  if (path.includes("fuel") || path.includes("history")) return "fuel";
  if (path.includes("coach")) return "coach";
  if (path.includes("progress")) return "progress";
  if (path.includes("you")) return "you";
  return "today";
};

/** Floating white pill tab bar — DESIGN.md Floating Tab Bar + s15 stitch nav. */
export const TabDock = () => {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const current = activeTab(path);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, space.lg) },
      ]}
    >
      <View
        accessibilityRole="tablist"
        style={[styles.dock, shadow.dock]}
      >
        {tabs.map((tab) => (
          <DockTab key={tab.id} active={current === tab.id} tab={tab} />
        ))}
      </View>
    </View>
  );
};

const DockTab = ({ tab, active }: { tab: TabDef; active: boolean }) => {
  const handlePress = () => {
    if (active) return;
    router.replace(tab.href);
  };

  const iconColor = active ? color.onPrimaryFixed : color.surface;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={handlePress}
      style={[
        styles.tab,
        active ? { backgroundColor: color.primaryContainer } : undefined,
      ]}
    >
      <tab.Icon
        size={22}
        color={iconColor}
        strokeWidth={active ? 2.25 : 2}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    alignItems: "center",
  },
  dock: {
    height: space.dock,
    width: 300,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.xs,
    borderRadius: radius.full,
    backgroundColor: color.primary,
    paddingHorizontal: space.xs,
  },
  tab: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
});
