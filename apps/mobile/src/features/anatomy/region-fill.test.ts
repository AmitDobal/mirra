import assert from "node:assert/strict";
import { test } from "node:test";

import { color } from "../../theme/tokens.ts";
import { MUSCLE_IDS } from "./muscle-ids.ts";
import { MALE_BACK } from "./paths/male-back.ts";
import { MALE_FRONT } from "./paths/male-front.ts";
import { FEMALE_BACK } from "./paths/female-back.ts";
import { FEMALE_FRONT } from "./paths/female-front.ts";
import { PASSIVE_OPACITY, regionPaint, resolveRegions, type AnatomyMode } from "./region-fill.ts";
import { musclesForSlug, slugsForMuscle } from "./region-map.ts";

const tierMode: AnatomyMode = { kind: "tier", steps: { chest: 10, lats: 3 } };
const byKey = (regions: ReturnType<typeof resolveRegions>, key: string) => {
  const r = regions.find((x) => x.key === key);
  assert.ok(r, `missing region ${key}`);
  return r;
};

test("tier mode: chest Gold II, upper back Bronze III, unranked passive", () => {
  const front = resolveRegions(MALE_FRONT.parts, "front", tierMode);
  const back = resolveRegions(MALE_BACK.parts, "back", tierMode);

  const chest = byKey(front, "chest");
  assert.equal(chest.fill, color.tier.gold);
  assert.equal(chest.fillOpacity, 1);
  assert.equal(chest.label, "Chest, Gold II");

  const upper = byKey(back, "upper-back");
  assert.equal(upper.fill, color.tier.bronze);
  assert.equal(upper.label, "Lats and upper back, Bronze III");

  const quads = byKey(front, "quadriceps");
  assert.equal(quads.fill, color.surfaceContainerHighest);
  assert.equal(quads.fillOpacity, PASSIVE_OPACITY);
  assert.equal(quads.label, "Quads, unranked");
});

test("tier mode: shared region takes the highest step", () => {
  const paint = regionPaint({ kind: "tier", steps: { front_delts: 2, side_delts: 14 } }, [
    "front_delts",
    "side_delts",
  ]);
  assert.deepEqual(paint, { kind: "tier", place: { tier: "platinum", division: "I" } });
});

test("focus mode: lime primary, lavender secondary, strongest role wins", () => {
  const mode: AnatomyMode = {
    kind: "focus",
    muscles: [
      { id: "chest", role: "primary" },
      { id: "front_delts", role: "secondary" },
      { id: "triceps", role: "secondary" },
    ],
  };
  const front = resolveRegions(MALE_FRONT.parts, "front", mode);
  const back = resolveRegions(MALE_BACK.parts, "back", mode);
  assert.equal(byKey(front, "chest").fill, color.primaryContainer);
  assert.equal(byKey(front, "deltoids").fill, color.secondary);
  assert.equal(byKey(front, "deltoids").label, "Front delts and side delts, secondary");
  assert.equal(byKey(back, "triceps").fill, color.secondary);
  assert.equal(byKey(back, "deltoids").fill, color.surfaceContainerHighest);
  assert.equal(byKey(front, "biceps").label, "Biceps, not targeted");
  assert.deepEqual(
    regionPaint({ kind: "focus", muscles: [{ id: "lats", role: "secondary" }, { id: "upper_back", role: "primary" }] }, [
      "lats",
      "upper_back",
    ]),
    { kind: "primary" },
  );
});

test("non-muscle art is plain surface, unlabeled, unmapped", () => {
  const front = resolveRegions(MALE_FRONT.parts, "front", tierMode);
  const head = byKey(front, "head");
  assert.equal(head.fill, color.surfaceContainerHigh);
  assert.equal(head.label, undefined);
  assert.deepEqual(head.muscles, []);
});

test("every muscle id is drawn on at least one side", () => {
  for (const id of MUSCLE_IDS) {
    const n = slugsForMuscle("front", id).length + slugsForMuscle("back", id).length;
    assert.ok(n > 0, `${id} not drawn`);
  }
});

test("every mapped slug exists in male and female art for that side", () => {
  const art = { front: [MALE_FRONT, FEMALE_FRONT], back: [MALE_BACK, FEMALE_BACK] } as const;
  for (const side of ["front", "back"] as const) {
    for (const fig of art[side]) {
      const slugs = new Set(fig.parts.map((p) => p.slug));
      for (const id of MUSCLE_IDS) {
        for (const slug of slugsForMuscle(side, id)) {
          assert.ok(slugs.has(slug), `${side} ${slug} missing (${id})`);
        }
      }
      for (const p of fig.parts) assert.ok(p.d.length > 0, `${p.slug} has no paths`);
    }
  }
  assert.deepEqual(musclesForSlug("back", "gluteal"), ["glutes"]);
});
