import assert from "node:assert/strict";
import { test } from "node:test";

import { createFinisher } from "./workout-finish";
import { formatVolume, loggedKey, sessionVolumeKg } from "./workout-volume";

type Calls = { complete: (number | null)[]; rpe: number[]; tiers: string[][] };

const harness = (opts: { slowComplete?: boolean } = {}) => {
  const state = { sessionId: "s1" as string | null, rpe: null as number | null };
  const calls: Calls = { complete: [], rpe: [], tiers: [] };
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => (release = r));
  const finisher = createFinisher<string>(
    {
      complete: async (_id, rpe) => {
        calls.complete.push(rpe);
        if (opts.slowComplete) await gate;
        return calls.complete.length === 1 ? ["chest → Gold"] : [];
      },
      saveRpe: async (_id, rpe) => {
        calls.rpe.push(rpe);
      },
    },
    {
      sessionId: () => state.sessionId,
      rpe: () => state.rpe,
      onTierChanges: (_id, changes) => calls.tiers.push([...changes]),
    },
  );
  return { state, calls, finisher, release };
};

test("HUD Finish completes once; S17 Done saves RPE without a second complete", async () => {
  const h = harness();
  await h.finisher.finish(); // HUD Finish, no RPE yet
  h.state.rpe = 7;
  await h.finisher.finish(); // S17 Done
  assert.deepEqual(h.calls.complete, [null]);
  assert.deepEqual(h.calls.rpe, [7]);
  assert.deepEqual(h.calls.tiers, [["chest → Gold"]]);
});

test("Done while the first complete is in flight still saves the RPE", async () => {
  const h = harness({ slowComplete: true });
  const hud = h.finisher.finish();
  h.state.rpe = 8;
  const done = h.finisher.finish();
  h.release();
  await Promise.all([hud, done]);
  assert.deepEqual(h.calls.complete, [null]);
  assert.deepEqual(h.calls.rpe, [8]);
});

test("unchanged / missing RPE is not re-sent; a new session completes again", async () => {
  const h = harness();
  h.state.rpe = 6;
  await h.finisher.finish(); // complete carries rpe 6
  await h.finisher.finish();
  assert.deepEqual(h.calls.rpe, []);
  h.state.sessionId = "s2";
  h.state.rpe = null;
  assert.equal(h.finisher.started("s2"), false);
  await h.finisher.finish();
  assert.deepEqual(h.calls.complete, [6, null]);
});

test("no session: nothing persisted", async () => {
  const h = harness();
  h.state.sessionId = null;
  await h.finisher.finish();
  assert.deepEqual(h.calls.complete, []);
});

test("volume = Σ kg × reps of logged sets; a corrected set replaces the old one", () => {
  const logged = {
    [loggedKey("bench", 1)]: { weightKg: 60, reps: 8 },
    [loggedKey("bench", 2)]: { weightKg: 60, reps: 8 },
    [loggedKey("row", 1)]: { weightKg: 50, reps: 10 },
    [loggedKey("pushup", 1)]: { weightKg: 0, reps: 15 },
  };
  assert.equal(sessionVolumeKg(logged), 1460);
  assert.equal(sessionVolumeKg({ ...logged, [loggedKey("bench", 2)]: { weightKg: 70, reps: 8 } }), 1540);
  assert.equal(sessionVolumeKg({}), 0);
});

test("volume shows in the user's unit", () => {
  assert.equal(formatVolume(0, "kg"), "0");
  assert.equal(formatVolume(560, "kg"), "560");
  assert.equal(formatVolume(1560, "kg"), "1.6k");
  assert.equal(formatVolume(1000, "lb"), "2.2k");
  assert.equal(formatVolume(200, "lb"), "441");
});
