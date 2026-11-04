import assert from "node:assert/strict";
import { test } from "node:test";

import { stackTransition, type TransitionKind } from "./transitions";

const kinds: TransitionKind[] = ["push", "root", "tabRoot", "session"];

test("no transition ever fades", () => {
  for (const os of ["ios", "android"] as const) {
    for (const kind of kinds) {
      assert.ok(!stackTransition(kind, os).animation.includes("fade"), `${kind}/${os}`);
    }
  }
});

test("push slides natively per platform and keeps the back gesture", () => {
  assert.equal(stackTransition("push", "ios").animation, "default");
  assert.equal(stackTransition("push", "android").animation, "ios_from_right");
  assert.equal(stackTransition("push", "ios").gestureEnabled, true);
});

test("live session is a full-screen modal from the bottom", () => {
  const t = stackTransition("session", "ios");
  assert.equal(t.presentation, "fullScreenModal");
  assert.equal(t.animation, "slide_from_bottom");
  assert.deepEqual(stackTransition("session", "android"), t);
});

test("tab and root swaps are instant", () => {
  assert.equal(stackTransition("tabRoot", "android").animation, "none");
  assert.equal(stackTransition("root", "ios").animation, "none");
});
