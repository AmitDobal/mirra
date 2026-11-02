import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyRestore, restoreWithLogin } from "./restore-flow.ts";

const info = (activeEntitlements: string[]) => ({ activeEntitlements });
const calls: string[] = [];
const port = (restore: unknown, login: unknown = { ok: true, value: info([]) }) =>
  ({
    logIn: async (id: string) => (calls.push(`logIn:${id}`), login),
    restore: async () => (calls.push("restore"), restore),
  }) as never;

test("empty restore ok is NOT pro", () => {
  const r = classifyRestore({ ok: true, value: info([]) }, "pro");
  assert.equal(r.kind, "none");
});

test("active pro entitlement is pro", () => {
  const r = classifyRestore({ ok: true, value: info(["pro"]) }, "pro");
  assert.equal(r.kind, "pro");
});

test("restore error surfaces message", () => {
  const r = classifyRestore(
    { ok: false, error: { code: "restore_failed", message: "offline" } },
    "pro",
  );
  assert.deepEqual(r, { kind: "error", message: "offline" });
});

test("logIn runs before restore when a session exists", async () => {
  calls.length = 0;
  await restoreWithLogin(port({ ok: true, value: info(["pro"]) }), "u1");
  assert.deepEqual(calls, ["logIn:u1", "restore"]);
});

test("no session → restore only; failed logIn skips restore", async () => {
  calls.length = 0;
  await restoreWithLogin(port({ ok: true, value: info([]) }), null);
  assert.deepEqual(calls, ["restore"]);
  calls.length = 0;
  const bad = { ok: false, error: { code: "unknown", message: "x" } };
  const r = await restoreWithLogin(port({ ok: true, value: info([]) }, bad), "u1");
  assert.equal(r.ok, false);
  assert.deepEqual(calls, ["logIn:u1"]);
});
