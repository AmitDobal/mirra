import { addDays, mondayOf } from "./dates";

export type HistoryRange = "day" | "week" | "month";

export type HistoryWindow = {
  from: string;
  to: string;
  /** Every calendar day from `from` to `to`, inclusive. */
  dates: string[];
};

/** Calendar window around `anchor`: the day, Monday-Sunday week, or calendar month (UTC). */
export const historyWindow = (range: HistoryRange, anchor: string): HistoryWindow => {
  let from = anchor;
  let to = anchor;
  if (range === "week") {
    from = mondayOf(anchor);
    to = addDays(from, 6);
  }
  if (range === "month") {
    from = `${anchor.slice(0, 7)}-01`;
    const d = new Date(`${from}T00:00:00.000Z`);
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(0);
    to = d.toISOString().slice(0, 10);
  }
  const dates: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);
  return { from, to, dates };
};

/** [start, end) ms covering every day in the window. */
export const windowBoundsMs = (w: Pick<HistoryWindow, "from" | "to">): { start: number; end: number } => ({
  start: Date.parse(`${w.from}T00:00:00.000Z`),
  end: Date.parse(`${addDays(w.to, 1)}T00:00:00.000Z`),
});
