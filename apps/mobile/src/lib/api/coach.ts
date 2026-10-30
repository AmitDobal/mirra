import { apiFetch } from "./client";
import type { CoachAdviseBody, CoachAdviseResponse } from "./types";

/** POST /v1/coach/advise — AI co-coach message + optional recalibration vectors. */
export const postCoachAdvise = (body: CoachAdviseBody) =>
  apiFetch<CoachAdviseResponse>("/v1/coach/advise", {
    method: "POST",
    body,
  });
