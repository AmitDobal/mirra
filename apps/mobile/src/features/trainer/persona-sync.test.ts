import assert from "node:assert/strict";
import { test } from "node:test";

import type { TrainerPersonaId } from "../../content/trainer-personas.ts";
import { syncPersona, type PersonaSyncDeps } from "./persona-sync.ts";

const harness = (opts: {
  local?: string | null;
  remote?: string | null;
  remoteError?: boolean;
  onRemote?: (state: { epoch: number }) => void;
}) => {
  const state = { persona: "drill" as TrainerPersonaId, epoch: 0, written: [] as string[] };
  const deps: PersonaSyncDeps = {
    readLocal: async () => opts.local,
    readRemote: async () => {
      opts.onRemote?.(state);
      if (opts.remoteError) throw new Error("offline");
      return opts.remote ?? null;
    },
    writeLocal: async (p) => {
      state.written.push(p);
    },
    getPersona: () => state.persona,
    setPersona: (p) => {
      state.persona = p;
    },
    getEpoch: () => state.epoch,
    warn: () => undefined,
  };
  return { state, deps };
};

test("server persona wins over default and local (QA: wit shown as drill)", async () => {
  const { state, deps } = harness({ local: "drill", remote: "wit" });
  assert.equal(await syncPersona(deps), "wit");
  assert.deepEqual(state.written, ["wit"]);
});

test("offline: local SQLite value is kept", async () => {
  const { state, deps } = harness({ local: "zen", remoteError: true });
  assert.equal(await syncPersona(deps), "zen");
  assert.deepEqual(state.written, []);
});

test("no remote preferences row: keeps local", async () => {
  const { deps } = harness({ local: "honey", remote: null });
  assert.equal(await syncPersona(deps), "honey");
});

test("unknown server id falls back to default persona", async () => {
  const { deps } = harness({ local: null, remote: "bogus" });
  assert.equal(await syncPersona(deps), "drill");
});

test("a pick made while hydrating is not overwritten by the stale server value", async () => {
  const { state, deps } = harness({
    local: "drill",
    remote: "wit",
    onRemote: (s) => {
      s.epoch += 1;
      state.persona = "rival";
    },
  });
  assert.equal(await syncPersona(deps), "rival");
  assert.deepEqual(state.written, []);
});
