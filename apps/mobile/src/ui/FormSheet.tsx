import { useEffect, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";

import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

import { CapsLabel } from "./CapsLabel";
import { Chip } from "./Chip";
import { LimeCta } from "./LimeCta";

export type FormField = {
  readonly key: string;
  readonly label: string;
  readonly numeric?: boolean;
  readonly placeholder?: string;
};

export type FormChoice = {
  readonly key: string;
  readonly label: string;
  readonly options: readonly string[];
};

type Props = {
  readonly visible: boolean;
  readonly title: string;
  readonly submitLabel: string;
  readonly fields: readonly FormField[];
  readonly choice?: FormChoice;
  /** Starting values keyed by field/choice key (strings). */
  readonly initial: Readonly<Record<string, string>>;
  readonly onClose: () => void;
  readonly onSubmit: (values: Record<string, string>) => void;
};

/** Small bottom sheet: text/number fields + one optional single-choice row. */
export const FormSheet = ({
  visible,
  title,
  submitLabel,
  fields,
  choice,
  initial,
  onClose,
  onSubmit,
}: Props) => {
  const [values, setValues] = useState<Record<string, string>>({ ...initial });

  useEffect(() => {
    if (visible) setValues({ ...initial });
  }, [visible, initial]);

  const setValue = (key: string, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    onSubmit(values);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${title}`}
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-lg")}
        >
          <CapsLabel>{title}</CapsLabel>
          {fields.map((field) => (
            <View key={field.key} style={sx("mt-space-sm")}>
              <CapsLabel>{field.label}</CapsLabel>
              <TextInput
                accessibilityLabel={field.label}
                placeholder={field.placeholder}
                placeholderTextColor={color.onSurfaceVariant}
                keyboardType={field.numeric ? "numeric" : "default"}
                value={values[field.key] ?? ""}
                onChangeText={(text) => setValue(field.key, text)}
                returnKeyType="done"
                style={sx(
                  "mt-1 rounded-lg bg-surface-container-highest px-space-md py-space-sm font-body text-body-md text-on-surface",
                )}
              />
            </View>
          ))}
          {choice ? (
            <View style={sx("mt-space-sm")}>
              <CapsLabel>{choice.label}</CapsLabel>
              <View style={sx("mt-1 flex-row flex-wrap gap-space-sm")}>
                {choice.options.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    selected={values[choice.key] === option}
                    onPress={() => setValue(choice.key, option)}
                  />
                ))}
              </View>
            </View>
          ) : null}
          <LimeCta label={submitLabel} onPress={handleSubmit} style={sx("mt-space-md")} />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
