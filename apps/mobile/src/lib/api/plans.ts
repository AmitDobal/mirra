import { apiFetch } from "./client";
import { normalizeCurrentPlan } from "./normalize-plan";
import type { CurrentPlan, PlanJobResponse } from "./types";

export const getPlanJob = (jobId: string) =>
  apiFetch<PlanJobResponse>(`/v1/plans/jobs/${encodeURIComponent(jobId)}`);

export const getCurrentPlan = async (): Promise<CurrentPlan> => {
  const raw = await apiFetch<unknown>("/v1/plans/current");
  const plan = normalizeCurrentPlan(raw);
  if (!plan) {
    throw new Error("Invalid current plan payload");
  }
  return plan;
};

export const previewRebuild = async (body: {
  checkInId?: string;
  reason: string;
}): Promise<{
  before: CurrentPlan | null;
  after: CurrentPlan | null;
  diffs: unknown[];
  previewToken?: string;
}> => {
  const raw = await apiFetch<{
    before: unknown;
    after: unknown;
    diffs: unknown[];
    previewToken?: string;
  }>("/v1/plans/rebuild/preview", { method: "POST", body });
  return {
    before: normalizeCurrentPlan(raw.before),
    after: normalizeCurrentPlan(raw.after),
    diffs: raw.diffs ?? [],
    previewToken: raw.previewToken,
  };
};

export const applyRebuild = async (
  body: { previewToken: string },
  idempotencyKey?: string,
): Promise<CurrentPlan> => {
  const raw = await apiFetch<unknown>("/v1/plans/rebuild/apply", {
    method: "POST",
    body,
    idempotencyKey,
  });
  const plan = normalizeCurrentPlan(raw);
  if (!plan) {
    throw new Error("Invalid rebuild apply payload");
  }
  return plan;
};
