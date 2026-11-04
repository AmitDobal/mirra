import assert from "node:assert/strict";
import { test } from "node:test";

import { heroLayout } from "./hero-layout.ts";

test("16 Pro / Pro Max keep Stitch S15c layout (actions beside the photo)", () => {
  assert.equal(heroLayout(402).compact, false);
  assert.equal(heroLayout(440).compact, false);
});

test("iPhone SE 375 and 320 widths stack actions full width (QA: 'tart Workout' clip)", () => {
  assert.deepEqual(heroLayout(375), { compact: true, photoW: 88, photoH: 112 });
  assert.equal(heroLayout(320).compact, true);
  assert.equal(heroLayout(390).compact, true);
});
