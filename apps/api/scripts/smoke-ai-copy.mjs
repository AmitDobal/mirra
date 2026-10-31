#!/usr/bin/env node
/**
 * Smoke: AI copy sanitizer + coach pills. Pure functions, no network.
 *   node --experimental-strip-types scripts/smoke-ai-copy.mjs
 * (Node 22.6+; strip-types is on by default from 22.18 / 23.6.)
 */
import { sanitizeAiCopy } from "../src/lib/ai-copy.ts";
import { deriveCoachPills } from "../src/services/coach-pills.ts";

let failures = 0;
const eq = (input, expected) => {
  const actual = sanitizeAiCopy(input);
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${JSON.stringify(input)}${ok ? "" : `\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`}`);
  if (!ok) failures += 1;
};
const clean = (input) => {
  const out = sanitizeAiCopy(input);
  const ok = !/[\u2014\u2013;]|--/.test(out) && out === out.trim() && !/\s{2}/.test(out);
  console.log(`${ok ? "PASS" : "FAIL"}  clean ${JSON.stringify(out)}`);
  if (!ok) failures += 1;
};

// Dashes become sentence breaks.
eq("You hit 2500 \u2014 that is 500 over.", "You hit 2500. That is 500 over.");
eq("Walk now \u2013 20 minutes.", "Walk now. 20 minutes.");
eq("Walk now -- 20 minutes.", "Walk now. 20 minutes.");
eq("Walk now\u2014then eat.", "Walk now, then eat.");
// Semicolons split clauses.
eq("Protein is short; eat 40g by 8:30 tonight.", "Protein is short. Eat 40g by 8:30 tonight.");
eq("Skip the snack;", "Skip the snack.");
// Times, decimals and plain hyphens survive.
eq("Dinner at 8:30 pm, 2.5 L water, well-known lift.", "Dinner at 8:30 pm, 2.5 L water, well-known lift.");
eq("Do 8\u201310 reps.", "Do 8 to 10 reps.");
// Already-terminated clause, stacked separators, edges.
eq("Done. \u2014 Next set.", "Done. Next set.");
eq("a \u2014 \u2014 b", "a. B");
eq("\u2014 start here", "start here");
eq("  spaced   out \n text  ", "spaced out text");
eq("", "");
clean("One;two\u2014three--four\u2013five;  six");

// Pills: deterministic, 1 to 3, no win alongside a call-out.
const ids = (input) => deriveCoachPills(input).map((p) => `${p.id}:${p.tone}`).join(",");
const pillEq = (label, input, expected) => {
  const actual = ids(input);
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  pills ${label}${ok ? "" : `  got ${actual} expected ${expected}`}`);
  if (!ok) failures += 1;
};
pillEq("over kcal", { scenario: "OVER_KCAL" }, "fuel_check:alert");
pillEq("on track", { scenario: "ON_TRACK" }, "on_track:win");
pillEq("rest toggle", { readiness: "rest" }, "recover:calm");
pillEq("missed lift", { scenario: "MISSED_LIFT" }, "recalibrate:push");
pillEq("over kcal + rest", { scenario: "OVER_KCAL", readiness: "rest" }, "fuel_check:alert,recover:calm");
pillEq("low readiness + rest dedupes", { scenario: "LOW_READINESS", readiness: 3 }, "recover:calm");
pillEq("on track + secondary win dropped", { scenario: "OVER_KCAL", secondary: ["ON_TRACK", "UNDER_PROTEIN", "MISSED_LIFT"], readiness: "rest" }, "fuel_check:alert,recover:calm,protein_gap:push");
pillEq("skipped status", { status: "skipped", readiness: "push" }, "recalibrate:push");
pillEq("done status only", { status: "done" }, "on_track:win");
pillEq("nothing", {}, "");

console.log(failures === 0 ? "\nAll ai-copy checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
