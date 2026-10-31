/**
 * Pure copy sanitizer for model-produced prose. No imports, no side effects, so the
 * smoke script can load it directly (node --experimental-strip-types).
 *
 * Rules: no em dashes, en dashes, double hyphens or semicolons. Prefer short sentences.
 */

/** One separator run: em dash, en dash, `--`+, or `;` (several in a row count as one). */
const SEPARATOR = String.raw`(?:[\u2014\u2013;]|-{2,})`;
const SEPARATOR_RUN = new RegExp(`\\s*${SEPARATOR}(?:\\s*${SEPARATOR})*\\s*`, "g");

/** Marks "capitalise the next letter" after a sentence break; removed in the final pass. */
const CAPITALIZE = "\u0001";

/** Lowercase continuations read better after a comma than as a new sentence. */
const CONTINUATIONS = new Set(["and", "but", "or", "so", "then", "because", "which", "while", "yet"]);

const TERMINAL = /[.!?]$/;
const SOFT_STOP = /[,:]$/;

/** 8–10 → "8 to 10"; Mon–Fri → "Mon to Fri" (unspaced en dash is a range, not a pause). */
const expandRanges = (text: string): string =>
  text.replace(/([0-9A-Za-z])\u2013([0-9A-Za-z])/g, "$1 to $2");

/** Replace one separator run with a sentence break (or a comma before a continuation word). */
const replaceSeparator = (
  match: string,
  offset: number,
  source: string,
): string => {
  const before = source.slice(0, offset).trimEnd();
  const after = source.slice(offset + match.length);
  // Trailing separator: close the sentence. Leading separator: drop it.
  if (after.trim() === "") return before === "" || TERMINAL.test(before) ? "" : ".";
  if (before === "") return "";

  const nextWord = after.match(/^[A-Za-z']+/)?.[0]?.toLowerCase() ?? "";
  const wasSemicolon = match.includes(";");
  const useComma =
    !wasSemicolon && CONTINUATIONS.has(nextWord) && !TERMINAL.test(before) && !SOFT_STOP.test(before);

  if (useComma) return ", ";
  if (TERMINAL.test(before) || SOFT_STOP.test(before)) return ` ${CAPITALIZE}`;
  return `. ${CAPITALIZE}`;
};

/** Strip em/en dashes, `--` and `;` from AI prose; split clauses into sentences. */
export const sanitizeAiCopy = (text: string): string => {
  if (!text) return "";
  const joined = expandRanges(text).replace(SEPARATOR_RUN, replaceSeparator);
  return joined
    .replace(new RegExp(`${CAPITALIZE}(\\S?)`, "g"), (_m, ch: string) => ch.toUpperCase())
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,\s*\./g, ".")
    .trim();
};
