import { View } from "react-native";

import { profileCopy } from "@/content/profile";
import type { TrainerPersonaId } from "@/content/trainer-personas";
import { AlertsToggle } from "@/features/alerts/AlertsToggle";
import type { CreditsSnapshot } from "@/lib/api/credits";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

import { CreditsMeter } from "./CreditsMeter";
import { SpeakCuesToggle } from "./SpeakCuesToggle";
import { TrainerCarousel } from "./TrainerCarousel";
import { Card, Divider, ToggleRow } from "./you-settings";

/** S41 AI credits card (surface-container-high, 24pt radius). */
export const YouCreditsCard = ({
  credits,
  onPress,
}: {
  credits: CreditsSnapshot | null;
  onPress: () => void;
}) => (
  <View style={sx("mt-4 overflow-hidden rounded-[24px] border border-surface-container-high bg-surface-container-high")}>
    <CreditsMeter credits={credits} onPress={onPress} />
  </View>
);

type CoachProps = {
  readonly persona: TrainerPersonaId;
  readonly personaSaving: boolean;
  readonly onChoosePersona: (id: TrainerPersonaId) => void;
};

/** S41 Coach section: trainer carousel, then voice cues / alerts / adaptive rebuild toggles. */
export const YouCoachSection = ({ persona, personaSaving, onChoosePersona }: CoachProps) => (
  <View style={sx("mt-7")}>
    <CapsLabel style={sx("mb-2 px-1")}>{profileCopy.sections.coach}</CapsLabel>
    <TrainerCarousel value={persona} disabled={personaSaving} onSelect={onChoosePersona} />
    <View style={sx("mt-4")}>
      <Card>
        <SpeakCuesToggle embedded />
        <Divider />
        <AlertsToggle />
        <Divider />
        <ToggleRow
          title="Adaptive rebuild"
          detail="Coming soon — redistributes missed sets after check-in"
          value={false}
          disabled
          onChange={() => undefined}
        />
      </Card>
    </View>
  </View>
);
