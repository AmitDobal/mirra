import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

/** Stitch rounded-lg ≈ token md (24px) — avoids 48px clip on dense rows. */
export const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={sx("mb-space-md")}>
    <CapsLabel style={sx("mb-space-sm")}>{title}</CapsLabel>
    <View style={sx("overflow-hidden rounded-md bg-surface-container-high")}>{children}</View>
  </View>
);

export const Divider = () => <View style={sx("h-px bg-outline-variant/30")} />;

export const Row = ({
  title,
  meta,
  onPress,
}: {
  title: string;
  meta: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title}
    onPress={onPress}
    style={sx("flex-row items-center justify-between px-space-md py-space-md")}
  >
    <View style={sx("flex-1 pr-space-md")}>
      <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{title}</Text>
      <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{meta}</Text>
    </View>
    <ChevronRight size={18} color={color.onSurfaceVariant} />
  </Pressable>
);

export const StatusRow = ({
  title,
  meta,
  soon = false,
}: {
  title: string;
  meta: string;
  /** Muted “Soon” chip — not a broken connection. */
  soon?: boolean;
}) => (
  <View style={sx("flex-row items-center justify-between gap-space-sm px-space-md py-space-md")}>
    <Text
      numberOfLines={1}
      style={sx("min-w-0 flex-1 font-headline-sm text-body-md text-on-surface")}
    >
      {title}
    </Text>
    <View style={sx("shrink-0 flex-row items-center gap-1.5")}>
      {!soon ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed }} />
      ) : null}
      <Text
        numberOfLines={1}
        style={sx(
          soon
            ? "font-label-bold text-[10px] leading-3 tracking-wide text-on-surface-variant"
            : "font-label-bold text-[10px] leading-3 tracking-wide text-primary-fixed",
        )}
      >
        {meta.toUpperCase()}
      </Text>
    </View>
  </View>
);

export const ToggleRow = ({
  title,
  detail,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <View
    style={sx(
      `flex-row items-center justify-between px-space-md py-space-md ${disabled ? "opacity-60" : ""}`,
    )}
  >
    <View style={sx("mr-space-md flex-1")}>
      <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{title}</Text>
      <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{detail}</Text>
    </View>
    <Switch
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixedDim }}
      thumbColor={value ? color.onPrimaryFixed : color.onSurfaceVariant}
    />
  </View>
);
