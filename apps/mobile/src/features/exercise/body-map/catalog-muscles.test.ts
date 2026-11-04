import assert from "node:assert/strict";
import { test } from "node:test";

import raw from "../../../content/exercise-catalog.json" with { type: "json" };
import { focusMusclesFor, musclesForLabel } from "./catalog-muscles.ts";

type Raw = { id: string; muscle: string; muscles: [string, number][] };
const catalog = raw as unknown as Raw[];

const focusOf = (id: string) => {
  const e = catalog.find((c) => c.id === id);
  assert.ok(e, id);
  const focus = focusMusclesFor(
    e.muscles.map(([name, pct]) => ({ name, pct })),
    e.muscle,
  );
  return Object.fromEntries(focus.map((m) => [m.id, m.role]));
};

test("bench: chest primary, front delts + triceps secondary, nothing else", () => {
  assert.deepEqual(focusOf("barbell-bench-press"), {
    chest: "primary",
    front_delts: "secondary",
    triceps: "secondary",
  });
});

test("back squat: quads + glutes primary, hamstrings + lower back secondary", () => {
  assert.deepEqual(focusOf("back-squat"), {
    quads: "primary",
    glutes: "primary",
    hamstrings: "secondary",
    lower_back: "secondary",
  });
});

test("labels split on & and pick the specific delt head", () => {
  assert.deepEqual(musclesForLabel("Anterior & Lateral Deltoids"), ["front_delts", "side_delts"]);
  assert.deepEqual(musclesForLabel("Biceps & Rear Deltoids"), ["biceps", "rear_delts"]);
  assert.deepEqual(musclesForLabel("Latissimus Dorsi & Rhomboids"), ["lats", "upper_back"]);
  assert.deepEqual(musclesForLabel("Hamstrings & Erectors"), ["hamstrings", "lower_back"]);
  assert.deepEqual(musclesForLabel("Pectoralis Major (Sternal & Clavicular)"), ["chest"]);
});

test("every catalog lift maps at least one primary muscle", () => {
  for (const e of catalog) {
    const roles = Object.values(focusOf(e.id));
    assert.ok(roles.includes("primary"), `${e.id} has no primary muscle`);
  }
});
