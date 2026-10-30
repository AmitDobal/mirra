import { createApp } from "./app";
import type { MirraEnv } from "./env";

const app = createApp();

export default {
  fetch: (request: Request, env: MirraEnv, ctx: ExecutionContext) =>
    app.fetch(request, env, ctx),
};
