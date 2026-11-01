import assert from "node:assert/strict";
import { test } from "node:test";

import { canSoftSkipPaywallFor, isDevTesterEnabled } from "./dev-tester-policy.ts";

test("prod build without flag stays hard-gated", () => {
  assert.equal(isDevTesterEnabled(false, false), false);
  assert.equal(canSoftSkipPaywallFor(false, false, true), false);
});

test("day-test flag enables Dev Tester outside __DEV__", () => {
  assert.equal(isDevTesterEnabled(false, true), true);
  assert.equal(canSoftSkipPaywallFor(false, true, true), true);
});

test("__DEV__ still enables Dev Tester", () => {
  assert.equal(isDevTesterEnabled(true, false), true);
});

test("soft-skip needs a session", () => {
  assert.equal(canSoftSkipPaywallFor(false, true, false), false);
});
