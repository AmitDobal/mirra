import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

import { t } from "./you-text";

/** S41 section: caps label + 24pt card (surface-container-low, 1px surface-container-high border). */
export const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={sx("mt-7")}>
    <CapsLabel style={sx("mb-2 px-1")}>{title}</CapsLabel>
    <Card>{children}</Card>
  </View>
);

export const Card = ({ children }: { children: ReactNode }) => (
  <View
    style={sx(
      "overflow-hidden rounded-[24px] border border-surface-container-high bg-surface-container-low",
    )}
  >
    {children}
  </View>
);

export const Divider = () => <View style={sx("h-px bg-outline-variant/30")} />;

/** S41 52pt row: label left, muted value + chevron right. `onPress` omitted = read-only. */
export const ValueRow = ({
  title,
  value,
  onPress,
  sub,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  /** Second line under the title (Subscription · Pro · Active). */
  sub?: string;
}) => (
  <Pressable
    accessibilityRole={onPress ? "button" : undefined}
    accessibilityLabel={value ? `${title}, ${value}` : title}
    disabled={!onPress}
    onPress={onPress}
    style={({ pressed }) => [
      sx("h-[52px] flex-row items-center justify-between gap-space-sm px-4"),
      pressed ? sx("bg-surface-container") : null,
    ]}
  >
    <View style={sx("shrink-0")}>
      <Text style={sx("font-body text-body-md text-on-surface")}>{title}</Text>
      {sub ? <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{sub}</Text> : null}
    </View>
    <View style={sx("min-w-0 flex-1 flex-row items-center justify-end gap-1")}>
      {value ? (
        <Text numberOfLines={1} style={sx("min-w-0 shrink font-body text-body-md text-on-surface-variant")}>
          {value}
        </Text>
      ) : null}
      {onPress ? <ChevronRight size={16} color={color.onSurfaceVariant} /> : null}
    </View>
  </Pressable>
);

export const StatusRow = ({
  title,
  meta,
  soon = false,
}: {
  title: string;
  meta: string;
  /** Muted “Soon” label — not a broken connection. */
  soon?: boolean;
}) => (
  <View style={sx("h-[52px] flex-row items-center justify-between gap-space-sm px-4")}>
    <Text numberOfLines={1} style={sx("min-w-0 flex-1 font-body text-body-md text-on-surface")}>
      {title}
    </Text>
    <View style={sx("shrink-0 flex-row items-center gap-1.5")}>
      {!soon ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed }} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[t.status, { color: soon ? color.onSurfaceVariant : color.primaryFixed }]}
      >
        {meta.toUpperCase()}
      </Text>
    </View>
  </View>
);

/** S41 toggle row: 14pt medium title, 12pt detail, iOS switch. */
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
  <View style={sx(`flex-row items-center justify-between p-4 ${disabled ? "opacity-60" : ""}`)}>
    <View style={sx("mr-3 flex-1")}>
      <Text style={sx("font-body-medium text-body-md text-on-surface")}>{title}</Text>
      <Text style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>{detail}</Text>
    </View>
    <Switch
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixed }}
      thumbColor={value ? color.onPrimaryFixed : color.onSurfaceVariant}
    />
  </View>
);
