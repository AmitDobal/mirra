import { apiFetch } from "./client";

/** Contract: `POST /v1/water { ml, localDate }` (contracts `WaterLogBodySchema`). */
export type LogWaterBody = {
  readonly ml: number;
  readonly localDate: string;
};

export type Hydration = {
  readonly targetMl: number;
  readonly loggedMl: number;
};

/** Mirrors contracts `WaterLogResponseSchema` (HTTP 201). */
export type LogWaterResponse = {
  readonly id: string;
  readonly ml: number;
  readonly localDate: string;
  readonly loggedAt: number;
  readonly hydration: Hydration;
};

export const logWater = (body: LogWaterBody) =>
  apiFetch<LogWaterResponse>("/v1/water", { method: "POST", body });
