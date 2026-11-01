import assert from "node:assert/strict";
import { test } from "node:test";

import {
  clearPostAuthIntent,
  peekPostAuthIntent,
  setPostAuthIntent,
  takePostAuthIntent,
} from "./post-auth-intent.ts";

test("welcome signin intent: set → peek → take clears once", () => {
  clearPostAuthIntent();
  setPostAuthIntent("signin");
  assert.equal(peekPostAuthIntent(), "signin");
  assert.equal(takePostAuthIntent(), "signin");
  assert.equal(takePostAuthIntent(), null);
  assert.equal(peekPostAuthIntent(), null);
});

test("paywall intent survives until take (mid-onboarding Google return)", () => {
  clearPostAuthIntent();
  setPostAuthIntent("paywall");
  assert.equal(peekPostAuthIntent(), "paywall");
  setPostAuthIntent("signin");
  assert.equal(peekPostAuthIntent(), "signin");
  assert.equal(takePostAuthIntent(), "signin");
  assert.equal(peekPostAuthIntent(), null);
});

test("clearPostAuthIntent drops pending without consume", () => {
  setPostAuthIntent("tabs");
  clearPostAuthIntent();
  assert.equal(peekPostAuthIntent(), null);
  assert.equal(takePostAuthIntent(), null);
});
