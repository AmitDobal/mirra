import type { UpdateProfileBody, UpdateProfileResponse } from "@mirra/contracts";

import { apiFetch } from "./client";

export type { UpdateProfileBody, UpdateProfileResponse };

/** PATCH /v1/me/profile — partial edit of onboarding answers. Never regenerates the plan. */
export const patchProfile = (body: UpdateProfileBody): Promise<UpdateProfileResponse> =>
  apiFetch<UpdateProfileResponse>("/v1/me/profile", { method: "PATCH", body });
