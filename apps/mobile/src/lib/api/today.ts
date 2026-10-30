import { apiFetch } from "./client";
import type { TodayResponse } from "./types";

export const getToday = (date?: string) =>
  apiFetch<TodayResponse>("/v1/today", {
    query: date ? { date } : undefined,
  });
