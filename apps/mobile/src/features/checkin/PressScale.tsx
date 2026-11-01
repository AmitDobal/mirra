import { MotiView } from "moti";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { timing } from "@/features/fuel/snap/motion";

export const PRESS_SCALE = 0.97;
const PRESS_MS = 100;

type Props = Omit<PressableProps, "style" | "children"> & {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
};

/** Pressable that scales to 0.97 on touch (Stitch `active:scale-95`, softened to match meal-snap). */
export const PressScale = ({ children, style, onPressIn, onPressOut, ...rest }: Props) => {
  const [pressed, setPressed] = useState(false);
  // The Pressable owns row layout (flex); the scaled inner view owns the look.
  const flex = StyleSheet.flatten(style)?.flex;

  return (
    <Pressable
      {...rest}
      style={flex != null ? { flex } : undefined}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    >
      <MotiView
        animate={{ scale: pressed ? PRESS_SCALE : 1 }}
        transition={timing({ duration: PRESS_MS })}
        style={style}
      >
        {children}
      </MotiView>
    </Pressable>
  );
};
