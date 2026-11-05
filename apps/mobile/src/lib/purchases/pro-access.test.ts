import assert from "node:assert/strict";
import { test } from "node:test";

import { ANDROID_PACKAGE, hasProAccess, manageSubscriptionUrl } from "./pro-access";

test("hasProAccess: server trial/active/grace or an in-session purchase", () => {
  assert.equal(hasProAccess({ me: "trial" }), true);
  assert.equal(hasProAccess({ me: "grace" }), true);
  assert.equal(hasProAccess({ me: "none", store: "active" }), true);
  assert.equal(hasProAccess({ cachedMe: "active" }), true);
  assert.equal(hasProAccess({ me: "none" }), false);
  assert.equal(hasProAccess({ me: "expired", store: "none" }), false);
  assert.equal(hasProAccess({}), false);
});

test("hasProAccess: a fresh /v1/me wins over a stale cached one", () => {
  assert.equal(hasProAccess({ me: "expired", cachedMe: "active" }), false);
});

test("manageSubscriptionUrl: Play subscriptions with package on Android, Apple account on iOS", () => {
  assert.equal(
    manageSubscriptionUrl("android"),
    `https://play.google.com/store/account/subscriptions?package=${ANDROID_PACKAGE}`,
  );
  assert.equal(manageSubscriptionUrl("ios"), "https://apps.apple.com/account/subscriptions");
});
