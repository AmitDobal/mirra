import { Bed, RefreshCw } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { copy } from "@/content/copy";
import type { CoachPill } from "@/lib/api";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { AiBadge } from "@/ui/AiBadge";
import { CapsLabel } from "@/ui/CapsLabel";

import { AiMoodPills } from "./AiMoodPills";

type Readiness = "push" | "rest";

type Props = {
  readonly title: string;
  readonly message: string;
  readonly pills: readonly CoachPill[];
  readonly onSelectVector: (vectorId: string) => void;
  readonly loading: boolean;
  readonly updatedLabel: string | null;
  readonly readiness: Readiness;
  readonly onReadinessChange: (readiness: Readiness) => void;
  readonly onRefresh: () => void;
};

/** Coach advise card: AI badge, corner refresh, readiness toggle. */
export const AdviseCard = ({
  title,
  message,
  pills,
  onSelectVector,
  loading,
  updatedLabel,
  readiness,
  onReadinessChange,
  onRefresh,
}: Props) => {
  const c = copy.coach;
  return (
    <View style={sx("mb-space-md rounded-lg bg-primary-fixed p-space-lg")}>
      <View style={sx("flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-space-sm")}>
          <AiBadge tone="dark" size={22} />
          <CapsLabel tone="dark">{c.calibration}</CapsLabel>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh coach advice"
          accessibilityState={{ disabled: loading, busy: loading }}
          disabled={loading}
          hitSlop={8}
          onPress={onRefresh}
          style={sx(`h-9 w-9 items-center justify-center rounded-full bg-on-primary-fixed/15 ${
            loading ? "opacity-50" : ""
          }`)}
        >
          {loading ? (
            <ActivityIndicator size="small" color={color.onPrimaryFixed} />
          ) : (
            <RefreshCw size={16} color={color.onPrimaryFixed} />
          )}
        </Pressable>
      </View>
      <Text style={sx("mt-space-sm font-headline text-headline-lg text-on-primary-fixed")}>
        {title}
      </Text>
      <View style={sx("mt-space-sm")}>
        {loading ? (
          <View style={sx("mt-space-sm flex-row items-center gap-2")}>
            <ActivityIndicator color={color.onPrimaryFixed} />
            <Text style={sx("font-body-medium text-body-md text-on-primary-fixed/85")}>
              {c.loading}
            </Text>
          </View>
        ) : (
          <Text style={sx("mt-space-sm font-body-medium text-body-md text-on-primary-fixed/85")}>
            {message}
          </Text>
        )}
        {loading ? null : (
          <AiMoodPills
            pills={pills}
            onSetReadiness={onReadinessChange}
            onSelectVector={onSelectVector}
          />
        )}
        {updatedLabel && !loading ? (
          <Text style={sx("mt-space-xs font-body text-body-sm text-on-primary-fixed/60")}>
            {updatedLabel}
          </Text>
        ) : null}
      </View>
      <View style={sx("mt-space-md flex-row gap-space-sm")}>
        <Chip
          label={c.push}
          active={readiness === "push"}
          onPress={() => onReadinessChange("push")}
        />
        <Chip
          label={c.rest}
          Icon={Bed}
          active={readiness === "rest"}
          onPress={() => onReadinessChange("rest")}
        />
      </View>
    </View>
  );
};

const Chip = ({
  label,
  active,
  Icon,
  onPress,
}: {
  label: string;
  active?: boolean;
  Icon?: typeof Bed;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ selected: !!active }}
    onPress={onPress}
    style={sx(`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${
      active ? "bg-on-primary-fixed" : "bg-on-primary-fixed/15"
    }`)}
  >
    {Icon ? <Icon size={14} color={active ? color.primaryFixed : color.onPrimaryFixed} /> : null}
    <Text
      style={sx(`font-label text-label-md ${
        active ? "text-primary-fixed" : "text-on-primary-fixed"
      }`)}
    >
      {label}
    </Text>
  </Pressable>
);
