/**
 * Offline assertions: fail-closed prod impersonation + Pro helper contract.
 *   npx tsx apps/api/scripts/assert-auth-harden.ts
 */
import { isDevUserHeaderAllowed, isProductionEnv } from "../src/lib/runtime-env";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

check(!isProductionEnv({}), "empty env is not production");
check(
  isProductionEnv({ MIRRA_ENV: "production" }),
  "MIRRA_ENV=production is production",
);
check(
  isProductionEnv({ APP_ENV: "production" }),
  "APP_ENV=production is production",
);
check(
  isProductionEnv({ ENVIRONMENT: "production" }),
  "ENVIRONMENT=production is production",
);
check(
  !isProductionEnv({ MIRRA_ENV: "day-test" }),
  "MIRRA_ENV=day-test is not production",
);

check(
  isDevUserHeaderAllowed({ ALLOW_DEV_USER_HEADER: "true" }),
  "day-test: ALLOW_DEV_USER_HEADER=true honors header",
);
check(
  !isDevUserHeaderAllowed({ ALLOW_DEV_USER_HEADER: "false" }),
  "flag false blocks header",
);
check(
  !isDevUserHeaderAllowed({}),
  "missing flag blocks header",
);
check(
  !isDevUserHeaderAllowed({
    ALLOW_DEV_USER_HEADER: "true",
    MIRRA_ENV: "production",
  }),
  "fail-closed: MIRRA_ENV=production ignores ALLOW_DEV_USER_HEADER",
);
check(
  !isDevUserHeaderAllowed({
    ALLOW_DEV_USER_HEADER: "true",
    APP_ENV: "production",
  }),
  "fail-closed: APP_ENV=production ignores ALLOW_DEV_USER_HEADER",
);
check(
  !isDevUserHeaderAllowed({
    ALLOW_DEV_USER_HEADER: "true",
    ENVIRONMENT: "Production",
  }),
  "fail-closed: ENVIRONMENT=Production (case-insensitive)",
);

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll auth-harden assertions passed");
