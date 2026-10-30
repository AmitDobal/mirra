import { apiFetch } from "./client";
import type { OnboardingPutBody, PlanGenerateResponse } from "./types";

export const putOnboarding = (body: OnboardingPutBody) =>
  apiFetch<{ ok: true }>("/v1/onboarding", { method: "PUT", body });

export const generatePlan = (idempotencyKey?: string) =>
  apiFetch<PlanGenerateResponse>("/v1/plans/generate", {
    method: "POST",
    body: {},
    idempotencyKey,
  });
