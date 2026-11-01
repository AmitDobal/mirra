import { env } from "@/lib/config/env";

import { isDevTesterEnabled } from "./dev-tester-policy";

/** Single runtime gate: Dev Tester button, soft-skip paywall, `finishAfterAuth("dev")`. */
export const devTesterAllowed = (): boolean =>
  isDevTesterEnabled(__DEV__, env.allowDevAuth);
