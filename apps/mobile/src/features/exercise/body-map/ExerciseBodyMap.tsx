import { Text, View } from "react-native";

import { imageryGenderForSex } from "@/features/onboarding/imagery";
import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";

import type { CatalogEntry } from "../catalog";
import { AnatomySilhouette } from "./AnatomySilhouette";
import { regionsForMuscles } from "./muscle-regions";
import { useProfileSex } from "./use-profile-sex";

type Props = {
  readonly entry: CatalogEntry;
};

const primaryNames = (muscles: CatalogEntry["muscles"]) =>
  muscles
    .slice(0, 2)
    .map((m) => m.name.split("(")[0]?.trim() ?? m.name)
    .join(", ");

/** S31/S32 kinetic body map on exercise detail (profile sex, crimson primary). */
export const ExerciseBodyMap = ({ entry }: Props) => {
  const sex = useProfileSex();
  const gender = imageryGenderForSex(sex);
  const highlights = regionsForMuscles(entry.muscles, entry.muscle);
  const primaryPct = entry.muscles[0]?.pct ?? 0;

  return (
    <View style={sx("rounded-DEFAULT border border-outline-variant bg-surface-container-low p-4 gap-3")}>
      <View style={sx("flex-row items-center justify-between gap-2")}>
        <Text style={sx("font-label text-[10px] uppercase tracking-wider text-on-surface-variant")}>
          Kinetic body map
        </Text>
        <Text style={sx("font-label text-[10px] text-primary-fixed")}>
          {gender === "female" ? "Female physique" : "Male physique"}
        </Text>
      </View>

      <View style={sx("flex-row items-center justify-between rounded-xl border border-outline-variant bg-surface-container px-3 py-2")}>
        <LegendDot tone="primary" label="Primary" detail={primaryNames(entry.muscles)} />
        <View style={sx("h-4 w-px bg-outline-variant")} />
        <LegendDot tone="secondary" label="Secondary" detail="Supporting chains" />
      </View>

      <View
        style={sx(
          "rounded-xl border border-outline-variant bg-surface-container overflow-hidden items-center py-2",
        )}
      >
        <View style={sx("flex-row items-center justify-between w-full px-3 pb-1")}>
          <Text style={sx("font-label text-[10px] uppercase text-on-surface-variant")}>Anterior view</Text>
          <Text style={sx("font-label-bold text-[10px] text-streak-fire")}>{primaryPct}% focus</Text>
        </View>
        <AnatomySilhouette gender={gender} highlights={highlights} height={220} />
      </View>
    </View>
  );
};

const LegendDot = ({
  tone,
  label,
  detail,
}: {
  readonly tone: "primary" | "secondary";
  readonly label: string;
  readonly detail: string;
}) => {
  const dotColor = tone === "primary" ? color.streakFire : color.primaryFixed;
  return (
    <View style={sx("flex-row items-center gap-2 flex-1")}>
      <View style={[sx("w-2.5 h-2.5 rounded-full"), { backgroundColor: dotColor }]} />
      <View style={sx("flex-1")}>
        <Text style={sx("font-label-bold text-[10px] text-on-surface")}>{label.toUpperCase()}</Text>
        <Text style={sx("font-body text-[10px] text-on-surface-variant")} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </View>
  );
};
