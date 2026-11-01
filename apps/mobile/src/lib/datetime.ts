/**
 * Device-timezone date/time formatting.
 *
 * Storage contract: every timestamp (`eatenAt`, `takenAt`, …) is **UTC epoch
 * milliseconds**. Never persist a formatted string. Convert to the device
 * timezone only at display time via the helpers below.
 *
 * NOTE: `localDate` buckets sent to the API stay UTC `YYYY-MM-DD` (the server
 * day-bounds are UTC). `localTodayIso()` is for *display* and device-calendar
 * logic only.
 */

const pad = (n: number): string => String(n).padStart(2, "0");

/** "9:41 AM" in the device timezone/locale. */
export const formatLocalTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** "Mon, Nov 2" in the device timezone/locale. */
export const formatLocalDate = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

/** "Mon, Nov 2 · 9:41 AM". */
export const formatLocalDateTime = (ms: number): string =>
  `${formatLocalDate(ms)} · ${formatLocalTime(ms)}`;

/** Device-calendar `YYYY-MM-DD` for the given instant (default: now). */
export const localDateIso = (ms: number = Date.now()): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Today's `YYYY-MM-DD` on the device calendar (not UTC). */
export const localTodayIso = (): string => localDateIso();
