import type { HealthResponse } from "@mirra/contracts";
import { Hono } from "hono";

import type { MirraEnv } from "../env";
import type { RequestIdVars } from "../middleware/request-id";

export const healthRoutes = new Hono<{
  Bindings: MirraEnv;
  Variables: RequestIdVars;
}>();

healthRoutes.get("/health", (c) => {
  const body: HealthResponse = {
    ok: true,
    version: c.env.APP_VERSION ?? "0.1.0",
  };
  return c.json(body);
});
