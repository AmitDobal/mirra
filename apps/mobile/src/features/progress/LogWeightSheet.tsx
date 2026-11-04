import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { useLoadUnit } from "@/features/workout/use-load-units";

import { validWeightKg, weightInputText, weightRangeText } from "./body-weight-input";

type Props = {
  readonly visible: boolean;
  readonly saving: boolean;
  readonly initialKg: number | null;
  readonly onClose: () => void;
  readonly onSubmit: (kg: number) => void;
};

/** Bottom sheet with one weight field in the user's unit (kg or lb); always submits kg. */
export const LogWeightSheet = ({ visible, saving, initialKg, onClose, onSubmit }: Props) => {
  const unit = useLoadUnit();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setText(weightInputText(initialKg, unit));
    setError(null);
  }, [visible, initialKg, unit]);

  const handleSave = () => {
    const kg = validWeightKg(text, unit);
    if (kg === null) {
      setError(`Enter a weight between ${weightRangeText(unit)}.`);
      return;
    }
    setError(null);
    onSubmit(kg);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss log weight"
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg")}
        >
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>Log weight</Text>
          <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
            Your plan uses your latest weight.
          </Text>
          <View style={sx("mt-space-md flex-row items-center gap-space-sm")}>
            <TextInput
              accessibilityLabel={unit === "kg" ? "Weight in kilograms" : "Weight in pounds"}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              autoFocus
              placeholder="0.0"
              placeholderTextColor={color.onSurfaceVariant}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              style={sx("flex-1 rounded-lg bg-surface-container-high px-space-md py-space-sm font-display text-headline-md text-on-surface")}
            />
            <CapsLabel>{unit}</CapsLabel>
          </View>
          {error ? <CapsLabel tone="alert" style={sx("mt-space-sm")}>{error}</CapsLabel> : null}
          <LimeCta
            label={saving ? "Saving…" : "Save"}
            onPress={handleSave}
            style={sx(`mt-space-md ${saving ? "opacity-40" : ""}`)}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
