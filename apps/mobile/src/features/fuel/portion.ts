import type { PlannedItem } from "@/lib/api";

const GLYPH_VALUE: Readonly<Record<string, number>> = { "¼": 0.25, "½": 0.5, "¾": 0.75 };
const NO_PLURAL = new Set(["medium", "tbsp"]);

/** Split a unit label like "1 egg" / "½ cup" / "3 cakes" into its base count + noun. */
const parseUnitLabel = (label: string): { readonly base: number; readonly noun: string } => {
  const match = /^(\d+(?:\.\d+)?|[¼½¾])\s+(.+)$/.exec(label.trim());
  if (!match) return { base: 1, noun: label.trim() };
  const raw = match[1] ?? "1";
  return { base: GLYPH_VALUE[raw] ?? Number(raw), noun: match[2] ?? "" };
};

const formatQty = (qty: number): string => {
  const whole = Math.floor(qty);
  const frac = Math.round((qty - whole) * 4) / 4;
  const glyph = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  if (frac === 1) return String(whole + 1);
  if (!glyph) return String(whole);
  return whole === 0 ? glyph : `${whole}${glyph}`;
};

const pluralize = (noun: string, qty: number): string => {
  if (qty <= 1) return noun;
  const words = noun.split(" ");
  const last = words[words.length - 1] ?? noun;
  if (NO_PLURAL.has(last) || last.endsWith("s")) return noun;
  words[words.length - 1] = last === "handful" ? "handfuls" : `${last}s`;
  return words.join(" ");
};

/** "3 eggs", "1½ cups", "½ avocado" — household portion for a planned item. */
export const formatPortion = (item: Pick<PlannedItem, "unitLabel" | "unitQty">): string => {
  const { base, noun } = parseUnitLabel(item.unitLabel);
  const qty = item.unitQty * base;
  return `${formatQty(qty)} ${pluralize(noun, qty)}`;
};
