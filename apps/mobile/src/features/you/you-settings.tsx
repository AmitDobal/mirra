import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

export const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={sx("mb-space-md")}>
    <CapsLabel style={sx("mb-space-sm")}>{title}</CapsLabel>
    <View style={sx("overflow-hidden rounded-2xl bg-surface-container-high")}>{children}</View>
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

export const StatusRow = ({ title, meta }: { title: string; meta: string }) => (
  <View style={sx("flex-row items-center justify-between gap-space-sm px-space-md py-space-md")}>
    <Text
      numberOfLines={1}
      style={sx("min-w-0 flex-1 font-headline-sm text-body-md text-on-surface")}
    >
      {title}
    </Text>
    <View style={sx("shrink-0 flex-row items-center gap-1.5")}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color.primaryFixed }} />
      <Text
        numberOfLines={1}
        style={sx("font-label-bold text-[10px] leading-3 tracking-wide text-primary-fixed")}
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
}: {
  title: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) => (
  <View style={sx("flex-row items-center justify-between px-space-md py-space-md")}>
    <View style={sx("mr-space-md flex-1")}>
      <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{title}</Text>
      <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{detail}</Text>
    </View>
    <Switch
      accessibilityLabel={title}
      value={value}
      onValueChange={onChange}
      trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixedDim }}
      thumbColor={value ? color.onPrimaryFixed : color.onSurfaceVariant}
    />
  </View>
);
