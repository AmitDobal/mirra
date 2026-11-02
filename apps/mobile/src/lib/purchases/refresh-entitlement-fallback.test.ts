import assert from "node:assert/strict";
import { test } from "node:test";

import { fallbackEntitlementStatus } from "./refresh-entitlement-fallback.ts";

test("RC fail + not entitled → none (never trial)", () => {
  assert.equal(fallbackEntitlementStatus(false), "none");
});

test("RC fail + entitled flag → active", () => {
  assert.equal(fallbackEntitlementStatus(true), "active");
});
