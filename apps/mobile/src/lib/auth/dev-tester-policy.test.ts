import assert from "node:assert/strict";
import { test } from "node:test";

import { canDevTrialFor, canSoftSkipPaywallFor, isDevTesterEnabled } from "./dev-tester-policy.ts";

test("dev trial: only a Dev Tester session in a dev/day-test build", () => {
  assert.equal(canDevTrialFor(false, true, "dev"), true);
  assert.equal(canDevTrialFor(true, false, "dev"), true);
  assert.equal(canDevTrialFor(false, false, "dev"), false);
  assert.equal(canDevTrialFor(false, true, "google"), false);
  assert.equal(canDevTrialFor(false, true, null), false);
});

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
