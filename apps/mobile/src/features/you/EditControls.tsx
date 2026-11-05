import { Minus, Plus } from "lucide-react-native";
import { Pressable, Text, TextInput, View } from "react-native";

import { color, font } from "@/theme/tokens";
import { sx } from "@/theme/sx";
import { Chip } from "@/ui/Chip";

import type { Option } from "./profile-fields";

/** Single pick, onboarding chip style. `nullable` lets a second tap clear it (Physique). */
export const ChoiceChips = ({
  options,
  value,
  nullable = false,
  onChange,
}: {
  options: readonly Option[];
  value: string | number | null | undefined;
  nullable?: boolean;
  onChange: (v: string | number | null) => void;
}) => (
  <View style={sx("flex-row flex-wrap gap-space-sm")}>
    {options.map((o) => (
      <Chip
        key={String(o.id)}
        label={o.label}
        selected={value === o.id}
        onPress={() => onChange(nullable && value === o.id ? null : o.id)}
      />
    ))}
  </View>
);

/** Multi pick: chips (equipment) or S08 day circles (training days). */
export const MultiChips = ({
  options,
  value,
  days = false,
  onChange,
}: {
  options: readonly Option[];
  value: readonly (string | number)[];
  days?: boolean;
  onChange: (v: (string | number)[]) => void;
}) => {
  const toggle = (id: string | number) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  if (!days) {
    return (
      <View style={sx("flex-row flex-wrap gap-space-sm")}>
        {options.map((o) => (
          <Chip key={String(o.id)} label={o.label} showCheck selected={value.includes(o.id)} onPress={() => toggle(o.id)} />
        ))}
      </View>
    );
  }
  return (
    <View style={sx("flex-row justify-between")}>
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <Pressable
            key={String(o.id)}
            accessibilityRole="button"
            accessibilityLabel={`Day ${o.label}`}
            accessibilityState={{ selected: on }}
            onPress={() => toggle(o.id)}
            style={[
              sx(`items-center justify-center ${on ? "bg-primary-container" : "bg-surface-container-high"}`),
              { width: 44, height: 44, borderRadius: 22 },
            ]}
          >
            <Text style={sx(`font-label text-label-lg ${on ? "text-on-primary-fixed" : "text-on-surface"}`)}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const StepBtn = ({ label, Icon, onPress }: { label: string; Icon: typeof Plus; onPress: () => void }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    hitSlop={8}
    style={[sx("items-center justify-center bg-surface-container-highest"), { width: 44, height: 44, borderRadius: 22 }]}
  >
    <Icon size={18} color={color.onSurface} />
  </Pressable>
);

const fmt = (n: number | null | undefined) => (n == null || !Number.isFinite(n) ? "" : String(n));

/** − value + stepper with a typeable number in the middle. */
export const NumberStepper = ({
  value,
  min,
  max,
  step,
  suffix,
  label,
  onChange,
}: {
  value: number | null | undefined;
  min: number;
  max: number;
  step: number;
  suffix: string;
  label: string;
  onChange: (v: number | null) => void;
}) => {
  const bump = (dir: 1 | -1) => {
    const base = value ?? (dir > 0 ? min - step : max + step);
    onChange(Math.min(max, Math.max(min, Math.round((base + dir * step) * 10) / 10)));
  };
  return (
    <View style={sx("flex-row items-center justify-between gap-space-md")}>
      <StepBtn label={`Decrease ${label}`} Icon={Minus} onPress={() => bump(-1)} />
      <View style={sx("flex-1 flex-row items-baseline justify-center gap-1")}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="decimal-pad"
          value={fmt(value)}
          placeholder="—"
          placeholderTextColor={color.onSurfaceVariant}
          onChangeText={(txt) => {
            const n = Number(txt.replace(",", "."));
            onChange(txt.trim() === "" || !Number.isFinite(n) ? null : n);
          }}
          style={{ fontFamily: font.headline, fontSize: 38, lineHeight: 44, color: color.onSurface, minWidth: 64, textAlign: "center" }}
        />
        <Text style={sx("font-label text-label-lg text-on-surface-variant")}>{suffix}</Text>
      </View>
      <StepBtn label={`Increase ${label}`} Icon={Plus} onPress={() => bump(1)} />
    </View>
  );
};

/** Imperial height: feet + inches steppers side by side. */
export const HeightStepper = ({
  ft,
  inch,
  onChange,
}: {
  ft: number;
  inch: number;
  onChange: (v: { ft: number; inch: number }) => void;
}) => (
  <View style={sx("gap-space-md")}>
    <NumberStepper label="Feet" value={ft} min={4} max={8} step={1} suffix="ft" onChange={(v) => onChange({ ft: v ?? 4, inch })} />
    <NumberStepper label="Inches" value={inch} min={0} max={11} step={1} suffix="in" onChange={(v) => onChange({ ft, inch: v ?? 0 })} />
  </View>
);

export const NotesInput = ({
  value,
  placeholder,
  max,
  onChange,
}: {
  value: string;
  placeholder: string;
  max: number;
  onChange: (v: string) => void;
}) => (
  <TextInput
    accessibilityLabel="About your days"
    multiline
    maxLength={max}
    value={value}
    placeholder={placeholder}
    placeholderTextColor={color.onSurfaceVariant}
    onChangeText={onChange}
    textAlignVertical="top"
    style={[
      sx("rounded-[16px] bg-surface-container-highest px-space-md py-space-sm font-body text-body-md text-on-surface"),
      { minHeight: 120, maxHeight: 200 },
    ]}
  />
);
