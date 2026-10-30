import {
  generatePlan,
  getCurrentPlan as getApiCurrentPlan,
  getPlanJob,
  putOnboarding,
} from "@/lib/api";
import type { OnboardingPutBody, PlanJobResponse } from "@/lib/api/types";
import { usePlanStore } from "@/stores/plan-store";

import type { OnboardingAnswers, OnboardingWeekPlan } from "../types";
import { toOnboardingBody } from "../map-body";
import { generateLocalWeekPlan } from "./local-plan-generator";
import { persistOnboardingProfile, persistWeekPlan } from "./plan-persist";

const POLL_MS = 400;
const POLL_MAX = 40;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const jobDone = (status: string) =>
  status === "done" || status === "succeeded";

const pollJob = async (jobId: string): Promise<PlanJobResponse> => {
  let last: PlanJobResponse = { status: "queued" };
  for (let i = 0; i < POLL_MAX; i++) {
    last = await getPlanJob(jobId);
    if (jobDone(last.status) || last.status === "failed") return last;
    await sleep(POLL_MS);
  }
  return last;
};

const normalizeApiPlan = (raw: unknown): OnboardingWeekPlan | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (r.plan && typeof r.plan === "object") {
    const p = r.plan as Record<string, unknown>;
    const days = Array.isArray(r.days) ? r.days : [];
    const workouts = Array.isArray(r.workouts) ? r.workouts : [];
    if (!p.id) return null;
    const summary =
      p.summary && typeof p.summary === "object"
        ? (p.summary as OnboardingWeekPlan["summary"])
        : undefined;
    return {
      id: String(p.id),
      version: Number(p.version ?? 1),
      status: String(p.status ?? "ready"),
      weekStart: String(p.weekStart ?? ""),
      summary,
      days: days as OnboardingWeekPlan["days"],
      workouts: workouts as OnboardingWeekPlan["workouts"],
      source: "api",
    };
  }

  if (typeof r.id === "string" && Array.isArray(r.days)) {
    return {
      id: r.id,
      version: Number(r.version ?? 1),
      status: String(r.status ?? "ready"),
      weekStart: String(r.weekStart ?? ""),
      summary: r.summary as OnboardingWeekPlan["summary"],
      days: r.days as OnboardingWeekPlan["days"],
      workouts: [],
      source: "api",
    };
  }

  return null;
};

const tryApiGenerate = async (
  body: OnboardingPutBody,
): Promise<OnboardingWeekPlan> => {
  await putOnboarding(body);
  const key = `onb-${Date.now()}`;
  const { jobId } = await generatePlan(key);
  usePlanStore.getState().setJob(jobId, { status: "queued" });
  const job = await pollJob(jobId);
  usePlanStore.getState().setJob(jobId, job);
  if (job.status === "failed") {
    throw new Error(job.error ?? "Plan job failed");
  }
  if (!jobDone(job.status)) {
    throw new Error("Plan job timed out");
  }
  const raw = await getApiCurrentPlan();
  usePlanStore.getState().setPlan(raw);
  const plan = normalizeApiPlan(raw);
  if (!plan || plan.days.length === 0) {
    throw new Error("Empty current plan");
  }
  return plan;
};

/**
 * PUT onboarding → POST generate → poll; local heuristic fallback.
 * Persists profile via `saveOnboarding` and plan via `savePlan`.
 */
export const runOnboardingGenerate = async (
  answers: OnboardingAnswers,
): Promise<OnboardingWeekPlan> => {
  const body = toOnboardingBody(answers);
  await persistOnboardingProfile(body);

  try {
    const apiPlan = await tryApiGenerate(body);
    return persistWeekPlan(apiPlan, "api");
  } catch {
    return generateLocalWeekPlan(body);
  }
};
