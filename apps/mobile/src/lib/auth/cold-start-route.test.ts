import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isEntitledStatus,
  resolveColdStartRoute,
  resolveTabGuard,
} from "./cold-start-route.ts";

const base = {
  hasSession: true,
  serverOnboarded: true as boolean | null,
  localCompleted: false,
  planGenerated: false,
  entitled: false,
};

test("A: guest with plan resumes week-reveal; after auth + reveal → paywall", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, hasSession: false, serverOnboarded: null, planGenerated: true }),
    "/(onboarding)/week-reveal",
  );
  assert.equal(
    resolveColdStartRoute({
      ...base, serverOnboarded: false, planGenerated: true, revealSeen: true, afterSignIn: true,
    }),
    "/(onboarding)/paywall",
  );
});

test("B: new Google user via welcome → onboarding start, never tabs", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: false, afterSignIn: true }),
    "/(onboarding)/goal",
  );
});

test("C/F: returning onboarded + entitled → today", () => {
  assert.equal(resolveColdStartRoute({ ...base, entitled: true, afterSignIn: true }), "/(tabs)/today");
  assert.equal(resolveColdStartRoute({ ...base, entitled: true }), "/(tabs)/today");
});

test("D: returning onboarded, not entitled → paywall", () => {
  assert.equal(resolveColdStartRoute({ ...base, afterSignIn: true }), "/(onboarding)/paywall");
  assert.equal(resolveColdStartRoute({ ...base, localCompleted: true }), "/(onboarding)/paywall");
});

test("E: session, not onboarded → resume quiz (welcome), skip auth", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: false }),
    "/(onboarding)/welcome",
  );
});

test("G: session + plan generated, funnel not complete → week-reveal", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, planGenerated: true }),
    "/(onboarding)/week-reveal",
  );
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: false, planGenerated: true }),
    "/(onboarding)/week-reveal",
  );
});

test("mid-funnel Google: planGenerated resumes reveal; revealSeen → paywall once", () => {
  assert.equal(
    resolveColdStartRoute({
      ...base, serverOnboarded: false, planGenerated: true, afterSignIn: true,
    }),
    "/(onboarding)/week-reveal",
  );
  assert.equal(
    resolveColdStartRoute({
      ...base,
      serverOnboarded: false,
      planGenerated: true,
      revealSeen: true,
      afterSignIn: true,
    }),
    "/(onboarding)/paywall",
  );
});

test("offline (me unknown): local completed + entitled cache → today; else gate", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: null, localCompleted: true, entitled: true }),
    "/(tabs)/today",
  );
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: null, localCompleted: true }),
    "/(onboarding)/paywall",
  );
  assert.equal(
    resolveColdStartRoute({ ...base, serverOnboarded: null }),
    "/(onboarding)/welcome",
  );
});

test("I: after delete (wiped, no session) → splash", () => {
  assert.equal(
    resolveColdStartRoute({ ...base, hasSession: false, serverOnboarded: null }),
    "/(onboarding)/splash",
  );
});

test("H + tab guard: blocks without session / onboarding / entitlement", () => {
  assert.equal(resolveTabGuard({ hasSession: false, onboarded: true, entitled: true }), "/(onboarding)/splash");
  assert.equal(resolveTabGuard({ hasSession: true, onboarded: false, entitled: true }), "/(onboarding)/welcome");
  assert.equal(resolveTabGuard({ hasSession: true, onboarded: true, entitled: false }), "/(onboarding)/paywall");
  assert.equal(resolveTabGuard({ hasSession: true, onboarded: true, entitled: true }), null);
  assert.equal(
    resolveTabGuard({ hasSession: true, onboarded: true, entitled: false, devPaywallSkip: true }),
    null,
  );
});

test("trial counts as entitled", () => {
  assert.equal(isEntitledStatus("trial"), true);
  assert.equal(isEntitledStatus("active"), true);
  assert.equal(isEntitledStatus("grace"), true);
  assert.equal(isEntitledStatus("expired"), false);
  assert.equal(isEntitledStatus("none"), false);
  assert.equal(isEntitledStatus(undefined), false);
});
