import type { KeyboardAvoidingViewProps } from "react-native";

/**
 * KeyboardAvoidingView behavior for every platform (AMI-177).
 * Android runs edge-to-edge (Expo SDK 54+), so the window no longer resizes for the
 * keyboard and screens must avoid it in JS. KAV pads only by the real overlap with the
 * keyboard, so it stays a no-op where the OS already resized the window.
 * JS-only: no app.json `softwareKeyboardLayoutMode` change, safe to ship over OTA.
 */
export const KEYBOARD_BEHAVIOR: KeyboardAvoidingViewProps["behavior"] = "padding";
