import { Text, View } from "react-native";

import type { TrainerPersonaId } from "@/content/trainer-personas";
import { AlertsToggle } from "@/features/alerts/AlertsToggle";
import { KineticRankTeaser } from "@/features/rank/KineticRankTeaser";
import { PersonaGrid } from "@/features/trainer";
import type { CreditsSnapshot } from "@/lib/api/credits";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

import { CreditsMeter } from "./CreditsMeter";
import { SpeakCuesToggle } from "./SpeakCuesToggle";
import { StrengthTeaser } from "./StrengthTeaser";
import { Divider, Group, ToggleRow } from "./you-settings";

type Props = {
  readonly credits: CreditsSnapshot | null;
  readonly onCreditsPress: () => void;
  readonly persona: TrainerPersonaId;
  readonly personaSaving: boolean;
  readonly onChoosePersona: (id: TrainerPersonaId) => void;
};

/** You tab card list under the hero: rank + strength teasers, AI credits, trainer picker. */
export const YouCards = ({ credits, onCreditsPress, persona, personaSaving, onChoosePersona }: Props) => (
  <>
    <KineticRankTeaser />
    <StrengthTeaser />

    <Group title="AI credits">
      <CreditsMeter credits={credits} onPress={onCreditsPress} />
    </Group>

    <View style={sx("mb-space-sm flex-row items-end justify-between gap-space-sm")}>
      <CapsLabel>Your trainer</CapsLabel>
      <Text numberOfLines={1} style={sx("shrink font-body text-[11px] text-on-surface-variant")}>
        Swipe to choose
      </Text>
    </View>
    <PersonaGrid compact value={persona} disabled={personaSaving} onSelect={onChoosePersona} />
  </>
);

/** You tab "Coaching" toggles (voice cues, alerts, adaptive rebuild placeholder). */
export const YouCoachingGroup = () => (
  <Group title="Coaching">
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
  </Group>
);
