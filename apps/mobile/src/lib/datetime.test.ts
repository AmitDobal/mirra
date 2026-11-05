import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { localDateIso, localDayBoundsMs, localTodayIso } from "./datetime";

const ORIGINAL_TZ = process.env.TZ;
const inZone = <T>(tz: string, fn: () => T): T => {
  process.env.TZ = tz;
  return fn();
};
afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

test("US evening: local date stays on the user's day (UTC is already tomorrow)", () => {
  // Wed Nov 4 7:30 PM PST = Thu Nov 5 03:30 UTC.
  const ms = Date.parse("2026-11-05T03:30:00.000Z");
  assert.equal(new Date(ms).toISOString().slice(0, 10), "2026-11-05");
  assert.equal(inZone("America/Los_Angeles", () => localDateIso(ms)), "2026-11-04");
  // Wed 8:00 PM EST = Thu 01:00 UTC.
  assert.equal(inZone("America/New_York", () => localDateIso(Date.parse("2026-11-05T01:00:00.000Z"))), "2026-11-04");
  // Wed 11:59 PM PST is still Wednesday.
  assert.equal(inZone("America/Los_Angeles", () => localDateIso(Date.parse("2026-11-05T07:59:00.000Z"))), "2026-11-04");
});

test("IST just past midnight: local date is the new day (UTC is still yesterday)", () => {
  // Thu Nov 5 00:32 IST = Wed Nov 4 19:02 UTC (QA R27).
  const ms = Date.parse("2026-11-04T19:02:00.000Z");
  assert.equal(new Date(ms).toISOString().slice(0, 10), "2026-11-04");
  assert.equal(inZone("Asia/Kolkata", () => localDateIso(ms)), "2026-11-05");
});

test("localTodayIso uses the device calendar", () => {
  const got = inZone("Asia/Kolkata", () => localTodayIso());
  const want = inZone("Asia/Kolkata", () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  assert.equal(got, want);
});

test("localDayBoundsMs: local midnight to midnight, 25h on the US DST fall-back day", () => {
  const ist = inZone("Asia/Kolkata", () => localDayBoundsMs("2026-11-05"));
  assert.equal(ist.start, Date.parse("2026-11-04T18:30:00.000Z"));
  assert.equal(ist.end, Date.parse("2026-11-05T18:30:00.000Z"));
  // US DST ends Sun Nov 1 2026: that day is 25h long in Los Angeles.
  const la = inZone("America/Los_Angeles", () => localDayBoundsMs("2026-11-01"));
  assert.equal(la.start, Date.parse("2026-11-01T07:00:00.000Z"));
  assert.equal(la.end - la.start, 25 * 3_600_000);
});
