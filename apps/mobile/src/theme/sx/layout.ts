import { spaceVal } from "./spacing";

/** Mutable style bag — RN style types are often readonly. */
export type Style = Record<string, string | number | undefined>;

/** Fixed utility classes → RN style (checked before any prefix rule). */
export const staticClasses: Record<string, Style> = {
  "flex-1": { flex: 1 },
  "flex-row": { flexDirection: "row" },
  "flex-col": { flexDirection: "column" },
  "flex-wrap": { flexWrap: "wrap" },
  "items-center": { alignItems: "center" },
  "items-start": { alignItems: "flex-start" },
  "items-end": { alignItems: "flex-end" },
  "items-stretch": { alignItems: "stretch" },
  "items-baseline": { alignItems: "baseline" },
  "justify-center": { justifyContent: "center" },
  "justify-between": { justifyContent: "space-between" },
  "justify-start": { justifyContent: "flex-start" },
  "justify-end": { justifyContent: "flex-end" },
  "self-start": { alignSelf: "flex-start" },
  "self-end": { alignSelf: "flex-end" },
  "self-center": { alignSelf: "center" },
  "self-stretch": { alignSelf: "stretch" },
  absolute: { position: "absolute" },
  relative: { position: "relative" },
  "inset-0": { top: 0, right: 0, bottom: 0, left: 0 },
  "inset-x-0": { left: 0, right: 0 },
  "overflow-hidden": { overflow: "hidden" },
  grow: { flexGrow: 1 },
  "flex-grow": { flexGrow: 1 },
  "shrink-0": { flexShrink: 0 },
  uppercase: { textTransform: "uppercase" },
  "text-center": { textAlign: "center" },
  "text-left": { textAlign: "left" },
  "text-right": { textAlign: "right" },
  underline: { textDecorationLine: "underline" },
  "tracking-widest": { letterSpacing: 2 },
  border: { borderWidth: 1 },
  "border-transparent": { borderColor: "transparent" },
  "bg-transparent": { backgroundColor: "transparent" },
  "opacity-0": { opacity: 0 },
  "opacity-40": { opacity: 0.4 },
  "opacity-60": { opacity: 0.6 },
  "opacity-90": { opacity: 0.9 },
  "opacity-100": { opacity: 1 },
  "z-50": { zIndex: 50 },
  "w-full": { width: "100%" },
  "h-full": { height: "100%" },
  "min-w-0": { minWidth: 0 },
};

/** Prefix → RN prop for spacing-valued classes, in match order. */
export const spaceProps: readonly (readonly [string, string])[] = [
  ["gap", "gap"],
  ["p", "padding"],
  ["px", "paddingHorizontal"],
  ["py", "paddingVertical"],
  ["pt", "paddingTop"],
  ["pb", "paddingBottom"],
  ["pl", "paddingLeft"],
  ["pr", "paddingRight"],
  ["m", "margin"],
  ["mx", "marginHorizontal"],
  ["my", "marginVertical"],
  ["mt", "marginTop"],
  ["mb", "marginBottom"],
  ["ml", "marginLeft"],
  ["mr", "marginRight"],
  ["h", "height"],
  ["w", "width"],
  ["min-h", "minHeight"],
];

const OFFSET = /^(-?)(top|bottom|left|right)-(.+)$/;

/** `top-0`, `left-4`, `-bottom-1`, `right-[3px]` → absolute offsets. */
export const applyOffset = (cls: string, out: Style): boolean => {
  const m = cls.match(OFFSET);
  if (!m) return false;
  const v = spaceVal(m[3]);
  if (v !== undefined) out[m[2]] = m[1] ? -v : v;
  return true;
};
