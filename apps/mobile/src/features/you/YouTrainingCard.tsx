import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { profileCopy } from "@/content/profile";
import type { LocalPlan } from "@/db";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { sx } from "@/theme/sx";

import type { ProfileRow, ProfileRowId } from "./profile-format";
import { RowsSection } from "./RowsSection";
import type { TrainingLocationId } from "./training-location";
import { Divider } from "./you-settings";
import { t } from "./you-text";

const LOCATIONS: readonly { id: TrainingLocationId; label: string }[] = [
  { id: "gym", label: "Primary kit" },
  { id: "home", label: "Home" },
  { id: "hotel", label: "Hotel" },
];

export type { TrainingLocationId };

type Props = {
  readonly plan: LocalPlan | null;
  readonly rows: readonly ProfileRow[];
  readonly aboutDays: string;
  readonly onEdit: (id: ProfileRowId) => void;
  readonly locationId: TrainingLocationId;
  readonly locationSaving?: boolean;
  readonly onLocation: (id: TrainingLocationId) => void;
};

const weekLabel = (iso: string | undefined): string => {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** S41 Training card: active plan, field rows, training location chips, about your days. */
export const YouTrainingCard = ({ plan, rows, aboutDays, onEdit, locationId, locationSaving = false, onLocation }: Props) => {
  const protocolTitle = plan?.days.find((d) => d.workout)?.workout?.title ?? "No active plan";
  const protocolBody = plan
    ? `${plan.summary.kcalTarget.toLocaleString("en-US")} kcal · ${plan.summary.proteinG}g protein`
    : "Generate a plan to calibrate volume.";

  const activePlan = (
    <View style={sx("flex-row items-start justify-between gap-3 p-4")}>
      <View style={sx("min-w-0 flex-1")}>
        <CapsLabel>Active plan</CapsLabel>
        <Text style={t.weekOf}>Week of {weekLabel(plan?.weekStart)}</Text>
        <Text numberOfLines={1} style={[sx("mt-1"), t.tileTitle]}>{protocolTitle}</Text>
        <Text numberOfLines={2} style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>
          {protocolBody}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open coach check-in"
        onPress={() => router.push("/(tabs)/coach")}
        hitSlop={8}
        style={sx("mt-1")}
      >
        <Text style={t.planLink}>Open coach →</Text>
      </Pressable>
    </View>
  );

  const locations = (
    <>
      <Divider />
      <View style={sx("p-4")}>
        <View style={sx("flex-row items-center justify-between gap-space-sm")}>
          <CapsLabel>Training location</CapsLabel>
          {locationSaving ? <ActivityIndicator size="small" color={color.primaryFixed} /> : null}
        </View>
        <Text style={[t.hint, { marginTop: 2, marginBottom: 10 }]}>Filters kit for coach and plan rebuilds</Text>
        <View style={sx("flex-row flex-wrap gap-2")}>
          {LOCATIONS.map((loc) => {
            const active = locationId === loc.id;
            return (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                accessibilityLabel={loc.label}
                accessibilityState={{ selected: active, disabled: locationSaving }}
                disabled={locationSaving}
                onPress={() => onLocation(loc.id)}
                style={[
                  sx(`h-8 justify-center rounded-full ${active ? "bg-primary-fixed" : "bg-surface-container-highest"}`),
                  { paddingHorizontal: 14 },
                ]}
              >
                <Text numberOfLines={1} style={[t.locChip, { color: active ? color.onPrimaryFixed : color.onSurface }]}>
                  {loc.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Divider />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${profileCopy.rows.lifestyleNotes}, ${aboutDays}`}
        onPress={() => onEdit("lifestyleNotes")}
        style={({ pressed }) => [sx("flex-row items-center justify-between p-4"), pressed ? sx("bg-surface-container") : null]}
      >
        <View style={sx("min-w-0 flex-1 pr-3")}>
          <Text style={sx("font-body text-body-md text-on-surface")}>{profileCopy.rows.lifestyleNotes}</Text>
          <Text numberOfLines={1} style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>
            {aboutDays}
          </Text>
        </View>
        <ChevronRight size={16} color={color.onSurfaceVariant} />
      </Pressable>
    </>
  );

  return (
    <RowsSection
      title={profileCopy.sections.training}
      rows={rows}
      onEdit={onEdit}
      before={activePlan}
      after={locations}
    />
  );
};
