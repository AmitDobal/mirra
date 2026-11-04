import { logger } from "@/lib/logger";

import { apiFetch } from "./client";
import type { OnboardingPutBody, PlanGenerateResponse } from "./types";

export const putOnboarding = (body: OnboardingPutBody) => {
  // AMI-180 QA: the S43 commitment rides on this body (dev builds only).
  if (__DEV__) {
    logger.info("onboarding.put", { reset: body.reset ?? false, commitment: body.commitment ?? null });
  }
  return apiFetch<{ ok: true }>("/v1/onboarding", { method: "PUT", body });
};

export const generatePlan = (idempotencyKey?: string) =>
  apiFetch<PlanGenerateResponse>("/v1/plans/generate", {
    method: "POST",
    body: {},
    idempotencyKey,
  });
