import type { MirraEnv } from "../env";

type EnvFlags = Pick<MirraEnv, "MIRRA_ENV" | "APP_ENV" | "ENVIRONMENT" | "ALLOW_DEV_USER_HEADER">;

/** True when any production marker is set (fail-closed for day-test impersonation). */
export const isProductionEnv = (env: EnvFlags): boolean => {
  const markers = [env.MIRRA_ENV, env.APP_ENV, env.ENVIRONMENT];
  return markers.some((v) => v?.trim().toLowerCase() === "production");
};

/**
 * Day-test / local only. Never true when MIRRA_ENV / APP_ENV / ENVIRONMENT is `production`,
 * even if `ALLOW_DEV_USER_HEADER=true` was left on by mistake.
 */
export const isDevUserHeaderAllowed = (env: EnvFlags): boolean =>
  !isProductionEnv(env) && env.ALLOW_DEV_USER_HEADER === "true";
