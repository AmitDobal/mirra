import { apiFetch } from "./client";
import type { CurrentPlan, PlanJobResponse } from "./types";

export const getPlanJob = (jobId: string) =>
  apiFetch<PlanJobResponse>(`/v1/plans/jobs/${encodeURIComponent(jobId)}`);

export const getCurrentPlan = () =>
  apiFetch<CurrentPlan>("/v1/plans/current");

export const previewRebuild = (body: {
  checkInId?: string;
  reason: string;
}) =>
  apiFetch<{
    before: CurrentPlan;
    after: CurrentPlan;
    diffs: unknown[];
    previewToken?: string;
  }>("/v1/plans/rebuild/preview", { method: "POST", body });

export const applyRebuild = (
  body: { previewToken: string },
  idempotencyKey?: string,
) =>
  apiFetch<CurrentPlan>("/v1/plans/rebuild/apply", {
    method: "POST",
    body,
    idempotencyKey,
  });
