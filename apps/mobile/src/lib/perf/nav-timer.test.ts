import assert from "node:assert/strict";
import { test } from "node:test";

import { createNavTimer } from "./nav-timer";

test("settle returns ms since mark, then consumes it", () => {
  let t = 1000;
  const timer = createNavTimer(() => t);
  timer.mark("workout.live");
  t = 1240.4;
  assert.equal(timer.settle("workout.live"), 240);
  assert.equal(timer.settle("workout.live"), null);
});

test("settle without a mark is null; newer mark wins", () => {
  let t = 0;
  const timer = createNavTimer(() => t);
  assert.equal(timer.settle("x"), null);
  timer.mark("x");
  t = 50;
  timer.mark("x");
  t = 80;
  assert.equal(timer.settle("x"), 30);
});
