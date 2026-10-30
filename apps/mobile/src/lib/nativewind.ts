import { cssInterop } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * Third-party hosts do not forward `className` unless remapped.
 * Do NOT cssInterop MotiView — Moti + Reanimated + css-interop crashes on React 19.3
 * (useReducer dispatch TDZ in native-interop).
 */
cssInterop(GestureHandlerRootView, { className: "style" });
