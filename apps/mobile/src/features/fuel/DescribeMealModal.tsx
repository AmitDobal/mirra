import { useState } from "react";
import { Modal, Pressable, TextInput } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

type Props = {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (text: string) => void;
};

/** Android fallback for Alert.prompt. */
export const DescribeMealModal = ({ visible, onClose, onSubmit }: Props) => {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    onClose();
    onSubmit(text);
    setText("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss describe meal"
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg")}
        >
          <CapsLabel>Describe meal</CapsLabel>
          <TextInput
            accessibilityLabel="Meal description"
            autoFocus
            placeholder="e.g. chicken rice bowl"
            placeholderTextColor={color.onSurfaceVariant}
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            style={sx(
              "mt-space-sm rounded-lg bg-surface-container-highest px-space-md py-space-sm font-body text-body-md text-on-surface",
            )}
          />
          <LimeCta label="Estimate" onPress={handleSubmit} style={sx("mt-space-md")} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};