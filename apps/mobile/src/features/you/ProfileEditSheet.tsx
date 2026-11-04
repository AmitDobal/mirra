import { ChevronLeft } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";

import { profileCopy as c } from "@/content/profile";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";
import { LimeCta } from "@/ui/LimeCta";

import { ChoiceChips, HeightStepper, MultiChips, NotesInput, NumberStepper } from "./EditControls";
import { draftToPatch, fieldSpec, initialDraft, type Draft, type EditableField } from "./profile-fields";
import type { PrefsSource, ProfileSource, Units } from "./profile-format";

/** Shared bottom-sheet chrome (scrim + surface-container-low panel), keyboard aware. */
export const SheetModal = ({
  visible,
  label,
  onClose,
  children,
}: {
  visible: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={sx("flex-1")}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${label}`}
        onPress={onClose}
        style={sx("flex-1 justify-end bg-black/40")}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={sx("rounded-t-lg bg-surface-container-low p-space-md pb-space-xl")}>
          {children}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  </Modal>
);

export type EditBodyProps = {
  readonly field: EditableField;
  readonly units: Units;
  readonly profile: ProfileSource | null;
  readonly prefs: PrefsSource | null;
  /** Called after a successful save. */
  readonly onDone: () => void;
  /** Resolve true when saved, false to show the error line. */
  readonly onSave: (patch: Record<string, unknown>) => Promise<boolean>;
  /** Shows a back chevron (Personal details list). */
  readonly onBack?: () => void;
};

/** Field editor content; controls follow the onboarding screens. */
export const ProfileEditBody = ({ field, units, profile, prefs, onDone, onSave, onBack }: EditBodyProps) => {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(field, units, profile, prefs));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset only when another field opens, not when background data refreshes mid-edit.
  useEffect(() => {
    setDraft(initialDraft(field, units, profile, prefs));
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field]);

  const spec = fieldSpec(field, units);
  const patch = draftToPatch(field, units, draft);
  const title = c.rows[field];

  const handleSave = async () => {
    if (!patch || saving) return;
    setSaving(true);
    setError(null);
    const ok = await onSave(patch);
    setSaving(false);
    if (ok) onDone();
    else setError(c.edit.failed);
  };

  const control = (() => {
    switch (spec.kind) {
      case "choice":
        return <ChoiceChips options={spec.options} value={draft.choice} nullable={spec.nullable} onChange={(v) => setDraft({ choice: v })} />;
      case "multi":
        return <MultiChips options={spec.options} value={draft.multi ?? []} days={spec.days} onChange={(v) => setDraft({ multi: v })} />;
      case "height":
        return <HeightStepper ft={draft.ft ?? 5} inch={draft.inch ?? 9} onChange={(v) => setDraft(v)} />;
      case "text":
        return <NotesInput value={draft.text ?? ""} max={spec.max} placeholder={c.edit.aboutPlaceholder} onChange={(v) => setDraft({ text: v })} />;
      case "number":
        return (
          <NumberStepper
            label={title}
            value={draft.num}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            suffix={spec.suffix}
            onChange={(v) => setDraft({ num: v })}
          />
        );
    }
  })();

  const clearable = spec.kind === "number" && spec.nullable && draft.num != null;

  return (
    <>
      <View style={sx("mb-space-md flex-row items-center justify-between")}>
        <View style={sx("flex-row items-center gap-2")}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back to personal details" onPress={onBack} hitSlop={10}>
              <ChevronLeft size={22} color={color.onSurface} />
            </Pressable>
          ) : null}
          <Text style={sx("font-headline-sm text-headline-sm text-on-surface")}>{title}</Text>
        </View>
        {clearable ? (
          <Pressable accessibilityRole="button" onPress={() => setDraft({ num: null })} hitSlop={8}>
            <Text style={sx("font-label text-label-md text-on-surface-variant")}>{c.edit.clear}</Text>
          </Pressable>
        ) : null}
      </View>
      {control}
      {field === "weightKg" ? (
        <Text style={sx("mt-space-sm font-body text-body-sm text-on-surface-variant")}>{c.edit.weightHint}</Text>
      ) : null}
      {error ? <CapsLabel tone="alert" style={sx("mt-space-sm")}>{error}</CapsLabel> : null}
      <LimeCta
        label={saving ? c.edit.saving : c.edit.save}
        onPress={() => void handleSave()}
        style={sx(`mt-space-md ${patch ? "" : "opacity-40"}`)}
      />
    </>
  );
};

type Props = Omit<EditBodyProps, "field" | "onDone" | "onBack"> & {
  /** Row being edited; null = closed. */
  readonly field: EditableField | null;
  readonly onClose: () => void;
};

/** One bottom sheet for every Training / Nutrition chevron row. */
export const ProfileEditSheet = ({ field, onClose, ...rest }: Props) =>
  field ? (
    <SheetModal visible label={c.rows[field]} onClose={onClose}>
      <ProfileEditBody field={field} onDone={onClose} {...rest} />
    </SheetModal>
  ) : null;
