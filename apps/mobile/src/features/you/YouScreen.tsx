import { ChevronRight, LogOut } from "lucide-react-native";
import { Pressable, Switch, Text, View } from "react-native";
import { useState } from "react";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { ScreenScroll } from "@/ui/ScreenScroll";
import { color } from "@/theme/tokens";

import { youMock as m } from "./mock";

/** S24 You / profile settings (html SoT — png missing). */
export const YouScreen = () => {
  const [toggles, setToggles] = useState(
    Object.fromEntries(m.toggles.map((t) => [t.id, t.on])),
  );

  return (
    <ScreenScroll>
      <View className="mb-space-md flex-row items-center gap-space-md">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-primary-fixed">
          <Text className="font-headline text-headline-md text-on-primary-fixed">AC</Text>
        </View>
        <View className="flex-1">
          <Text className="font-headline text-headline-md text-on-surface">{m.name}</Text>
          <Text className="font-body text-body-sm text-on-surface-variant">{m.handle}</Text>
        </View>
      </View>

      <View className="mb-space-md flex-row items-center justify-between rounded-lg bg-primary-fixed px-space-md py-space-sm">
        <CapsLabel tone="dark">{m.plan}</CapsLabel>
        <Text className="font-label-bold text-label-md text-on-primary-fixed">Manage</Text>
      </View>

      <View className="mb-space-md rounded-lg bg-surface-container-low p-space-md">
        <CapsLabel>Active Protocol Engine</CapsLabel>
        <Text className="mt-1 font-label text-label-md text-primary-fixed">{m.protocol}</Text>
        <Text className="mt-space-sm font-headline-sm text-headline-sm text-on-surface">
          {m.protocolTitle}
        </Text>
        <Text className="mt-1 font-body text-body-md text-on-surface-variant">{m.protocolBody}</Text>
        <View className="mt-space-md flex-row gap-space-sm">
          <Meta label="Microcycle Pace" value={m.pace} />
          <Meta label="Daily Macros" value={m.macros} />
        </View>
        <LimeCta label="Recalibrate Goals & Volume" onPress={() => undefined} className="mt-space-md" />
      </View>

      <CapsLabel className="mb-space-sm">Equipment Locations · 3 Presets</CapsLabel>
      {m.locations.map((loc) => (
        <View
          key={loc.id}
          className={`mb-space-sm rounded-lg border p-space-md ${
            loc.active
              ? "border-primary-fixed bg-surface-container-low"
              : "border-transparent bg-surface-container-high"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{loc.title}</Text>
            {loc.active ? (
              <CapsLabel tone="lime">Active</CapsLabel>
            ) : (
              <Text className="font-label text-label-md text-on-surface-variant">Select</Text>
            )}
          </View>
          <Text className="mt-1 font-body text-body-sm text-on-surface-variant">{loc.detail}</Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add location profile"
        onPress={() => undefined}
        className="mb-space-md items-center py-space-sm"
      >
        <Text className="font-label text-label-md text-primary-fixed">+ Add New Location Profile</Text>
      </Pressable>

      <CapsLabel className="mb-space-sm">Intelligence & HUD Controls</CapsLabel>
      {m.toggles.map((t) => (
        <View
          key={t.id}
          className="mb-space-sm flex-row items-center justify-between rounded-lg bg-surface-container-high p-space-md"
        >
          <View className="mr-space-md flex-1">
            <Text className="font-headline-sm text-headline-sm text-on-surface">{t.title}</Text>
            <Text className="font-body text-body-sm text-on-surface-variant">{t.detail}</Text>
          </View>
          <Switch
            accessibilityLabel={t.title}
            value={toggles[t.id]}
            onValueChange={(v) => setToggles((prev) => ({ ...prev, [t.id]: v }))}
            trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixedDim }}
            thumbColor={toggles[t.id] ? color.onPrimaryFixed : color.onSurfaceVariant}
          />
        </View>
      ))}

      <CapsLabel className="mb-space-sm mt-space-sm">Connected Hardware & Sync</CapsLabel>
      {m.hardware.map((h) => (
        <Row key={h.title} title={h.title} meta={h.meta} />
      ))}

      <CapsLabel className="mb-space-sm mt-space-md">Privacy & Data Engine</CapsLabel>
      <Row title="Biometric Data Vault" meta="Encrypted on-device" />
      <Row title="Export Training Data" meta="CSV / PDF" />
      <Row title="Subscription & Billing" meta="App Store" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => undefined}
        className="mt-space-lg flex-row items-center justify-center gap-space-sm rounded-full bg-surface-container-highest py-space-md"
      >
        <LogOut size={18} color={color.error} />
        <Text className="font-label-bold text-label-lg text-error">Log Out</Text>
      </Pressable>
      <Text className="mt-space-md text-center font-body text-body-sm text-on-surface-variant">
        {m.version}
      </Text>
    </ScreenScroll>
  );
};

const Meta = ({ label, value }: { label: string; value: string }) => (
  <View className="flex-1 rounded-sm bg-surface-container-high p-space-sm">
    <CapsLabel>{label}</CapsLabel>
    <Text className="mt-1 font-body-medium text-body-sm text-on-surface">{value}</Text>
  </View>
);

const Row = ({ title, meta }: { title: string; meta: string }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={() => undefined}
    className="mb-space-xs flex-row items-center justify-between rounded-lg bg-surface-container-high px-space-md py-space-md"
  >
    <View>
      <Text className="font-headline-sm text-headline-sm text-on-surface">{title}</Text>
      <Text className="font-body text-body-sm text-on-surface-variant">{meta}</Text>
    </View>
    <ChevronRight size={18} color={color.onSurfaceVariant} />
  </Pressable>
);
