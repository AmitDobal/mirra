import type {
  MuscleId,
  MuscleStrengthResponse,
  StrengthOverviewResponse,
} from "@mirra/contracts";

import { apiFetch } from "./client";

export type {
  BestSet,
  MuscleContributor,
  MuscleGroupId,
  MuscleStrengthResponse,
  NextTarget,
  StrengthOverviewResponse,
  StrengthUnits,
  TierStanding,
} from "@mirra/contracts";

/** `GET /v1/strength`: overall, unlock progress, 6 groups, 18 muscles (AMI-165). */
export const getStrengthOverview = () => apiFetch<StrengthOverviewResponse>("/v1/strength");

/** `GET /v1/strength/muscles/:muscleId`: standing, next set, contributing lifts. */
export const getMuscleStrength = (muscleId: MuscleId) =>
  apiFetch<MuscleStrengthResponse>(`/v1/strength/muscles/${encodeURIComponent(muscleId)}`);
