import { useCallback, useState } from "react";

import { getDayHistory, type DayHistory } from "@/lib/api";

import { DayHistorySheet, hasHistory } from "./DayHistorySheet";

/**
 * Tap a strip day: select it (existing behavior) and open its history when there is anything to show.
 * Future days and empty days only select. A failed fetch never blocks the selection.
 */
export const useDayHistory = (
  weekDates: readonly string[],
  today: string,
  selectDay: (index: number) => void,
) => {
  const [history, setHistory] = useState<DayHistory | null>(null);

  const onSelectDay = useCallback(
    (index: number) => {
      selectDay(index);
      const date = weekDates[index];
      if (!date || date > today) return;
      void getDayHistory(date)
        .then((h) => {
          if (hasHistory(h)) setHistory(h);
        })
        .catch(() => undefined);
    },
    [selectDay, weekDates, today],
  );

  const sheet = (
    <DayHistorySheet history={history} onClose={() => setHistory(null)} />
  );
  return { onSelectDay, sheet };
};
