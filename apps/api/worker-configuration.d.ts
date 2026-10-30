import type { MirraEnv } from "./src/env";

declare global {
  interface Env extends MirraEnv {}
}

export type { MirraEnv };
