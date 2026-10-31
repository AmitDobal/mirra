import { Minus, Plus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, Text, View } from "react-native";

import { CapsLabel } from "@/ui/CapsLabel";
import { color } from "@/theme/tokens";
import { sx } from "@/theme/sx";

const HOLD_DELAY_MS = 400;
const REPEAT_MS = 110;

type Props = {
  label: string;
  unit: string;
  value: number;
  /** +1 / -1 per tick; the store applies the step size. */
  onStep: (direction: 1 | -1) => void;
  /** Typed value (tap the number). */
  onCommit: (value: number) => void;
  disabled?: boolean;
};

const formatValue = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

/** KG / REPS stepper: tap ± to step, hold to repeat, tap number to type. */
export const SetStepper = ({ label, unit, value, onStep, onCommit, disabled }: Props) => {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopRepeat = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (repeatTimer.current) clearInterval(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  };

  useEffect(() => stopRepeat, []);

  const handlePressIn = (direction: 1 | -1) => {
    if (disabled) return;
    onStep(direction);
    holdTimer.current = setTimeout(() => {
      repeatTimer.current = setInterval(() => onStep(direction), REPEAT_MS);
    }, HOLD_DELAY_MS);
  };

  const handleStartTyping = () => {
    if (disabled) return;
    setText(formatValue(value));
    setTyping(true);
  };

  const handleEndTyping = () => {
    setTyping(false);
    const parsed = Number.parseFloat(text.replace(",", "."));
    if (Number.isFinite(parsed)) onCommit(parsed);
  };

  return (
    <View style={sx("flex-1 rounded-lg bg-surface-container-high p-space-sm")}>
      <CapsLabel style={sx("text-center")}>{label}</CapsLabel>
      <View style={sx("mt-1 flex-row items-center justify-between")}>
        <StepButton
          Icon={Minus}
          label={`Decrease ${label}`}
          onPressIn={() => handlePressIn(-1)}
          onPressOut={stopRepeat}
        />
        {typing ? (
          <TextInput
            autoFocus
            selectTextOnFocus
            keyboardType="decimal-pad"
            accessibilityLabel={`${label} value`}
            value={text}
            onChangeText={setText}
            onBlur={handleEndTyping}
            onSubmitEditing={handleEndTyping}
            style={sx("min-w-0 flex-1 text-center font-headline text-headline-md text-primary-fixed")}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${formatValue(value)} ${unit}, tap to type`}
            onPress={handleStartTyping}
            style={sx("min-w-0 flex-1 items-center")}
          >
            <Text style={sx("font-headline text-headline-md text-on-surface")}>
              {formatValue(value)}
            </Text>
          </Pressable>
        )}
        <StepButton
          Icon={Plus}
          label={`Increase ${label}`}
          onPressIn={() => handlePressIn(1)}
          onPressOut={stopRepeat}
        />
      </View>
    </View>
  );
};

const StepButton = ({
  Icon,
  label,
  onPressIn,
  onPressOut,
}: {
  Icon: typeof Plus;
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPressIn={onPressIn}
    onPressOut={onPressOut}
    style={({ pressed }) => [
      sx("h-11 w-11 items-center justify-center rounded-full bg-surface-container-highest"),
      { opacity: pressed ? 0.7 : 1 },
    ]}
  >
    <Icon size={20} color={color.primaryFixed} />
  </Pressable>
);
