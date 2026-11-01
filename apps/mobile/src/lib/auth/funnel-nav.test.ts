import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clearGoogleAuthHandoff,
  isGoogleAuthHandoff,
  markGoogleAuthHandoff,
  resetFunnelNavForTests,
  runFunnelNavExclusive,
  shouldReplaceFunnelDest,
} from "./funnel-nav.ts";

test("same dest within window is single-flight (no thrice paywall)", () => {
  resetFunnelNavForTests();
  const t0 = 1_000_000;
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/paywall", t0), true);
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/paywall", t0 + 500), false);
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/paywall", t0 + 1500), false);
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/paywall", t0 + 2600), true);
});

test("different dest always replaces", () => {
  resetFunnelNavForTests();
  const t0 = 2_000_000;
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/week-reveal", t0), true);
  assert.equal(shouldReplaceFunnelDest("/(onboarding)/paywall", t0 + 10), true);
});

test("exclusive runner: concurrent callers share one flight", async () => {
  resetFunnelNavForTests();
  let runs = 0;
  const task = async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 20));
  };
  await Promise.all([runFunnelNavExclusive(task), runFunnelNavExclusive(task)]);
  assert.equal(runs, 1);
});

test("google handoff flag gates auth auto-finish", () => {
  resetFunnelNavForTests();
  assert.equal(isGoogleAuthHandoff(), false);
  markGoogleAuthHandoff();
  assert.equal(isGoogleAuthHandoff(), true);
  clearGoogleAuthHandoff();
  assert.equal(isGoogleAuthHandoff(), false);
});
