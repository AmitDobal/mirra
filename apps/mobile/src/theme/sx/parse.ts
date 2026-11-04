import { radius } from "../tokens";

import { parseColor } from "./colors";
import { applyOffset, spaceProps, staticClasses, type Style } from "./layout";
import { radiusVal, spaceVal } from "./spacing";
import { fontFamily, fontWeight, typeScale } from "./type";

const own = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/** Applies one Tailwind-like class to `out`. Unknown classes are ignored. */
export const applyOne = (cls: string, out: Style): void => {
  if (!cls || cls === "true" || cls === "false") return;

  if (own(staticClasses, cls)) {
    Object.assign(out, staticClasses[cls]);
    return;
  }
  if (applyOffset(cls, out)) return;

  for (const [prefix, prop] of spaceProps) {
    if (!cls.startsWith(`${prefix}-`)) continue;
    const v = spaceVal(cls.slice(prefix.length + 1));
    if (v !== undefined) out[prop] = v;
    return;
  }

  let m = cls.match(/^max-w-\[(\d+)px\]$/);
  if (m) {
    out.maxWidth = Number(m[1]);
    return;
  }
  m = cls.match(/^max-h-\[(\d+)px\]$/);
  if (m) {
    out.maxHeight = Number(m[1]);
    return;
  }
  m = cls.match(/^aspect-\[(\d+)\/(\d+)\]$/);
  if (m) {
    out.aspectRatio = Number(m[1]) / Number(m[2]);
    return;
  }
  if (cls === "leading-tight") {
    // Relative tighten only when a type scale already set lineHeight.
    if (typeof out.lineHeight === "number" && typeof out.fontSize === "number") {
      out.lineHeight = Math.max(out.fontSize + 2, Math.round(out.lineHeight * 0.92));
    }
    return;
  }
  m = cls.match(/^(max-w|min-w)-(.+)$/);
  if (m) {
    const v = spaceVal(m[2]);
    if (v !== undefined) out[m[1] === "max-w" ? "maxWidth" : "minWidth"] = v;
    return;
  }

  if (cls === "rounded") {
    out.borderRadius = radius.DEFAULT;
    return;
  }
  m = cls.match(/^rounded-(.+)$/);
  if (m) {
    const v = radiusVal(m[1]);
    if (v !== undefined) out.borderRadius = v;
    return;
  }

  m = cls.match(/^(bg|text|border|font)-(.+)$/);
  if (!m) return;
  const [, kind, key] = m;
  if (kind === "bg") {
    const c = parseColor(key);
    if (c) out.backgroundColor = c;
    return;
  }
  if (kind === "text") {
    if (own(typeScale, key)) {
      Object.assign(out, typeScale[key]);
      return;
    }
    const c = parseColor(key);
    if (c) out.color = c;
    return;
  }
  if (kind === "border") {
    if (key === "0") {
      out.borderWidth = 0;
      return;
    }
    const c = parseColor(key);
    if (c) out.borderColor = c;
    return;
  }
  if (own(fontFamily, key)) out.fontFamily = fontFamily[key];
  else if (own(fontWeight, key)) out.fontWeight = fontWeight[key];
};
