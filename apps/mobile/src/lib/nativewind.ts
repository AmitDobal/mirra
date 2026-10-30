import { cssInterop } from "nativewind";
import { MotiView } from "moti";
import { GestureHandlerRootView } from "react-native-gesture-handler";

/**
 * Third-party hosts do not forward `className` unless remapped.
 * Register once at app boot (imported from root layout).
 */
cssInterop(GestureHandlerRootView, { className: "style" });
cssInterop(MotiView, { className: "style" });
