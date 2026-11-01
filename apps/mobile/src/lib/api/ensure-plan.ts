import { MirraApiError } from "./client";
import { generatePlan } from "./onboarding";
import { getCurrentPlan, getPlanJob } from "./plans";
import type { CurrentPlan, PlanJobResponse } from "./types";

const POLL_MS = 400;
const POLL_MAX = 40;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const jobDone = (status: string) =>
  status === "done" || status === "succeeded";

let inflight: Promise<CurrentPlan | null> | null = null;
/** Skip repeat generate after hard failures (onboarding incomplete / job failed). */
let skipEnsure = false;

const pollJob = async (jobId: string): Promise<PlanJobResponse> => {
  let last: PlanJobResponse = { status: "queued" };
  for (let i = 0; i < POLL_MAX; i++) {
    last = await getPlanJob(jobId);
    if (jobDone(last.status) || last.status === "failed") return last;
    await sleep(POLL_MS);
  }
  return last;
};

/**
 * Load the ready week plan from D1, or generate **once** from saved prefs.
 * Never regenerates when a ready plan already exists (coach rebuild is explicit).
 */
export const ensureCurrentWeekPlan = async (): Promise<CurrentPlan | null> => {
  const existing = await getCurrentPlan();
  if (existing?.days?.length) {
    skipEnsure = false;
    return existing;
  }
  if (skipEnsure) return null;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { jobId } = await generatePlan(`ensure-${Date.now()}`);
      const job = await pollJob(jobId);
      if (job.status === "failed" || !jobDone(job.status)) {
        skipEnsure = true;
        return null;
      }
      const plan = await getCurrentPlan();
      if (!plan?.days?.length) {
        skipEnsure = true;
        return null;
      }
      return plan;
    } catch (err) {
      if (err instanceof MirraApiError && (err.status === 400 || err.status === 409)) {
        skipEnsure = true;
      }
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};
