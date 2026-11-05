import assert from "node:assert/strict";
import { test } from "node:test";

import type { GoalResponse } from "@mirra/contracts";

import { day35 } from "./goal-fixture";
import { createGoalStore, type GoalCacheEntry, type GoalDeps, type GoalFetchResult } from "./goal-store-core";

const body = day35();
const later: GoalResponse = { ...body, trendKg: 79.2 };

type Harness = { calls: (string | null)[]; cache: GoalCacheEntry | null; replies: (GoalFetchResult | Error)[] };

const harness = (over: Partial<GoalDeps> = {}, init: Partial<Harness> = {}) => {
  const h: Harness = { calls: [], cache: null, replies: [], ...init };
  const deps: GoalDeps = {
    fetch: async (etag) => {
      h.calls.push(etag);
      const next = h.replies.shift() ?? { kind: "not_modified" as const };
      if (next instanceof Error) throw next;
      return next;
    },
    restart: async () => body,
    readCache: async () => h.cache,
    writeCache: async (e) => {
      h.cache = e;
    },
    ...over,
  };
  return { h, store: createGoalStore(deps) };
};

test("first load: no ETag, body stored and cached", async () => {
  const { h, store } = harness({}, { replies: [{ kind: "ok", body, etag: '"1-100"' }] });
  await store.getState().load();
  assert.deepEqual(h.calls, [null]);
  assert.equal(store.getState().status, "ready");
  assert.equal(store.getState().data, body);
  assert.deepEqual(h.cache, { body, etag: '"1-100"' });
});

test("cached body paints first, then revalidates with If-None-Match; 304 keeps it", async () => {
  const { h, store } = harness({}, { cache: { body, etag: '"1-100"' }, replies: [{ kind: "not_modified" }] });
  await store.getState().load();
  assert.deepEqual(h.calls, ['"1-100"']);
  assert.equal(store.getState().data, body);
  assert.equal(store.getState().status, "ready");
});

test("network error keeps shown data; with nothing shown the status is error", async () => {
  const a = harness({}, { cache: { body, etag: '"1"' }, replies: [new Error("offline")] });
  await a.store.getState().load();
  assert.equal(a.store.getState().status, "ready");
  assert.equal(a.store.getState().data, body);
  const b = harness({}, { replies: [new Error("offline")] });
  await b.store.getState().load();
  assert.equal(b.store.getState().status, "error");
  assert.equal(b.store.getState().data, null);
});

test("invalidate refetches with the current ETag and swaps in the new body", async () => {
  const { h, store } = harness({}, {
    replies: [
      { kind: "ok", body, etag: '"1-100"' },
      { kind: "ok", body: later, etag: '"1-200"' },
    ],
  });
  await store.getState().load();
  await store.getState().invalidate();
  assert.deepEqual(h.calls, [null, '"1-100"']);
  assert.equal(store.getState().data?.trendKg, 79.2);
  assert.equal(store.getState().etag, '"1-200"');
});

test("invalidate before anyone loaded is a no-op (no request from background writes)", async () => {
  const { h, store } = harness();
  await store.getState().invalidate();
  assert.deepEqual(h.calls, []);
  assert.equal(store.getState().status, "idle");
});

test("invalidate during an in-flight load fetches once more afterwards", async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const replies: GoalFetchResult[] = [
    { kind: "ok", body, etag: '"1-100"' },
    { kind: "ok", body: later, etag: '"1-200"' },
  ];
  const calls: (string | null)[] = [];
  const store = createGoalStore({
    fetch: async (etag) => {
      calls.push(etag);
      if (calls.length === 1) await gate;
      return replies.shift()!;
    },
    restart: async () => body,
    readCache: async () => null,
    writeCache: async () => undefined,
  });
  const first = store.getState().load();
  await Promise.resolve();
  const inv = store.getState().invalidate();
  release();
  await Promise.all([first, inv]);
  assert.equal(calls.length, 2);
  assert.equal(store.getState().data?.trendKg, 79.2);
});

test("restart: 429 maps to rate_limited and keeps data", async () => {
  const err = Object.assign(new Error("limited"), { status: 429 });
  const { store } = harness({ restart: async () => Promise.reject(err) }, { replies: [{ kind: "ok", body, etag: '"1"' }] });
  await store.getState().load();
  assert.equal(await store.getState().restart(), "rate_limited");
  assert.equal(store.getState().data, body);
  assert.equal(store.getState().restarting, false);
});

test("restart ok: new body shown, ETag dropped so the next GET is full", async () => {
  const restarted: GoalResponse = { ...body, plan: { ...body.plan!, version: 2 } };
  const { h, store } = harness({ restart: async () => restarted }, { replies: [{ kind: "ok", body, etag: '"1"' }] });
  await store.getState().load();
  assert.equal(await store.getState().restart(), "ok");
  assert.equal(store.getState().data?.plan?.version, 2);
  assert.equal(store.getState().etag, null);
  assert.equal(h.cache?.body.plan?.version, 2);
});
