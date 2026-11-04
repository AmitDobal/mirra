import assert from "node:assert/strict";
import { test } from "node:test";

import { createSessionLine, type OpenedSession } from "./session-line";

type Src = "api" | "local" | "none";

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

test("begin does not block: writes queue until the session opens, then run in order", async () => {
  const opened: OpenedSession<Src>[] = [];
  const line = createSessionLine<Src>((s) => opened.push(s));
  const open = deferred<OpenedSession<Src>>();
  void line.begin(() => open.promise);

  const log: string[] = [];
  void line.enqueue(async (s) => {
    log.push(`set1@${s.sessionId}`);
  });
  void line.enqueue(async (s) => {
    log.push(`set2@${s.sessionId}`);
  });
  assert.deepEqual(log, []);

  open.resolve({ sessionId: "s1", sessionSource: "api" });
  await line.drained();
  assert.deepEqual(log, ["set1@s1", "set2@s1"]);
  assert.deepEqual(opened, [{ sessionId: "s1", sessionSource: "api" }]);
});

test("a newer begin drops the stale open and its queued writes", async () => {
  const opened: string[] = [];
  const line = createSessionLine<Src>((s) => opened.push(s.sessionId ?? "null"));
  const slow = deferred<OpenedSession<Src>>();
  void line.begin(() => slow.promise);
  const log: string[] = [];
  void line.enqueue(async () => {
    log.push("old");
  });

  await line.begin(async () => ({ sessionId: "new", sessionSource: "local" }));
  slow.resolve({ sessionId: "old", sessionSource: "api" });
  await line.enqueue(async (s) => {
    log.push(s.sessionId);
  });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(opened, ["new"]);
  assert.deepEqual(log, ["new"]);
});

test("cancel makes a pending open a no-op; no session id skips writes", async () => {
  const opened: string[] = [];
  const line = createSessionLine<Src>((s) => opened.push(String(s.sessionId)));
  const open = deferred<OpenedSession<Src>>();
  void line.begin(() => open.promise);
  const gen = line.generation();
  line.cancel();
  assert.notEqual(line.generation(), gen);
  open.resolve({ sessionId: "s1", sessionSource: "api" });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(opened, []);
  assert.equal(await line.ready(), null);

  await line.begin(async () => ({ sessionId: null, sessionSource: "none" }));
  let ran = false;
  await line.enqueue(async () => {
    ran = true;
  });
  assert.equal(ran, false);
});

test("a failing write is reported and does not block later writes", async () => {
  const errors: unknown[] = [];
  const line = createSessionLine<Src>(() => undefined, (e) => errors.push(e));
  await line.begin(async () => ({ sessionId: "s", sessionSource: "api" }));
  void line.enqueue(async () => {
    throw new Error("boom");
  });
  let ran = false;
  await line.enqueue(async () => {
    ran = true;
  });
  assert.equal(ran, true);
  assert.equal(errors.length, 1);
});
