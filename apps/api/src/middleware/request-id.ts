import { createMiddleware } from "hono/factory";

import type { MirraEnv } from "../env";

export type RequestIdVars = {
  requestId: string;
};

export const requestIdMiddleware = createMiddleware<{
  Bindings: MirraEnv;
  Variables: RequestIdVars;
}>(async (c, next) => {
  const incoming = c.req.header("x-request-id");
  const requestId = incoming && incoming.length > 0 ? incoming : crypto.randomUUID();
  c.set("requestId", requestId);
  await next();
  c.header("x-request-id", requestId);
});
