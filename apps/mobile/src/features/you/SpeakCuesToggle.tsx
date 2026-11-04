import { useEffect, useState } from "react";
import { Play } from "lucide-react-native";
import { Pressable, Switch, Text, View } from "react-native";

import { playTodayVoiceCueOnce } from "@/features/coach/voice-cue";
import {
  getSpeakCuesEnabled,
  setSpeakCuesEnabled,
} from "@/features/coach/voice-cue-prefs";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  /** Flatten chrome when nested inside a settings Group card. */
  readonly embedded?: boolean;
};

/** Local-only preference (default on): speak one short coach cue when Today opens. */
export const SpeakCuesToggle = ({ embedded = false }: Props) => {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getSpeakCuesEnabled().then(setEnabled);
  }, []);

  const handleChange = (value: boolean) => {
    setEnabled(value);
    void setSpeakCuesEnabled(value);
  };

  const handlePlayNow = async () => {
    if (busy || !enabled) return;
    setBusy(true);
    try {
      await playTodayVoiceCueOnce({ force: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={sx(
        embedded
          ? "p-4"
          : "mb-space-sm rounded-lg bg-surface-container-high p-space-md",
      )}
    >
      <View style={sx("flex-row items-center justify-between")}>
        <View style={sx("mr-3 flex-1")}>
          <Text style={sx("font-body-medium text-body-md text-on-surface")}>Speak coach cues</Text>
          <Text style={[sx("font-body text-body-sm text-on-surface-variant"), { marginTop: 2 }]}>
            One short spoken tip a day when you open Today
          </Text>
        </View>
        <Switch
          accessibilityLabel="Speak coach cues"
          value={enabled}
          onValueChange={handleChange}
          trackColor={{ false: color.surfaceContainerHighest, true: color.primaryFixed }}
          thumbColor={enabled ? color.onPrimaryFixed : color.onSurfaceVariant}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play coach cue now"
        accessibilityState={{ disabled: busy || !enabled }}
        disabled={busy || !enabled}
        onPress={() => void handlePlayNow()}
        style={sx(`mt-3 h-10 flex-row items-center justify-center gap-1.5 rounded-full ${
          enabled ? "bg-primary-fixed" : "bg-surface-container-highest"
        }`)}
      >
        <Play
          size={14}
          color={enabled ? color.onPrimaryFixed : color.onSurfaceVariant}
          fill={enabled ? color.onPrimaryFixed : color.onSurfaceVariant}
        />
        <Text
          style={sx(`font-label text-label-md ${
            enabled ? "text-on-primary-fixed" : "text-on-surface-variant"
          }`)}
        >
          {busy ? "Speaking…" : "Play cue now"}
        </Text>
      </Pressable>
    </View>
  );
};
