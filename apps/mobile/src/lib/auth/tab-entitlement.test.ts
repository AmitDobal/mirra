import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isEntitledStatus,
  resolveEffectiveEntitlementStatus,
  resolveTabGuard,
} from "./cold-start-route.ts";

test("effective status: Zustand none + cached active → entitled for tab guard", () => {
  const effective = resolveEffectiveEntitlementStatus("none", "active");
  assert.equal(effective, "active");
  assert.equal(
    resolveTabGuard({ hasSession: true, onboarded: true, entitled: isEntitledStatus(effective) }),
    null,
  );
});

test("effective status: Zustand none + cached trial → tabs allowed", () => {
  const effective = resolveEffectiveEntitlementStatus("none", "trial");
  assert.equal(effective, "trial");
  assert.equal(isEntitledStatus(effective), true);
});

test("effective status: Zustand none + unentitled cache stays none → paywall", () => {
  const effective = resolveEffectiveEntitlementStatus("none", "none");
  assert.equal(effective, "none");
  assert.equal(
    resolveTabGuard({ hasSession: true, onboarded: true, entitled: isEntitledStatus(effective) }),
    "/(onboarding)/paywall",
  );
});

test("effective status: Zustand active wins over stale me none", () => {
  assert.equal(resolveEffectiveEntitlementStatus("active", "none"), "active");
});
