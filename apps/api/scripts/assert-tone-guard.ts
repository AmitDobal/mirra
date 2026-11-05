/**
 * AMI-184: shame guard (tone-guard.ts + goal-copy) and the persona tone rule. Offline.
 *   npm run test:tone -w @mirra/api
 */
import { COACH_TONE_RULE, personaPromptBlock, TRAINER_PERSONA_IDS } from "@mirra/contracts";

import { coachSystemPrompt, createOpenAiCoachAdvisor } from "../src/adapters/openai-coach-advisor";
import { heuristicCoachAdvisor } from "../src/adapters/heuristic-coach-advisor";
import type { MirraEnv } from "../src/env";
import { goalCopyHits, guardGoalCopy } from "../src/services/goal-copy";
import { findShameHits } from "../src/services/tone-guard";
import { fixtureGoalContext, withStatus } from "./lib/goal-context-fixture";

let failures = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const BLOCK = [
  "Ah, the readiness of a soggy noodle at 2. Let's skip the excuses and get moving.",
  "No excuses, maggot. Squats now.",
  "Stop making excuses and lift.",
  "Spare me the excuses, recruit.",
  "That's a sad excuse for a session.",
  "You're so lazy this week.",
  "Pathetic effort today.",
  "You're weak. Prove me wrong.",
  "Quit whining and get moving.",
  "Get your act together, soldier.",
  "Man up and train.",
  "You look flabby. Fix it.",
  "Time to lose that muffin top.",
  "What a disappointment this week was.",
  "I'm disappointed in you.",
  "You've done nothing all week.",
  "Don't be a quitter.",
  "Couch potato energy today.",
  "Stop being such a wimp.",
  "You let yourself down again.",
  "Embarrassing numbers this week.",
  "You're a joke, recruit.",
  "Toughen up, crybaby.",
  "Noodle arms won't lift themselves.",
  "Worthless effort. Again.",
  "You should be ashamed of that week.",
  "Stop pigging out at night.",
  "You always quit on leg day.",
  "No time to slack off, soldier!",
  "Weak effort. Do better.",
  "You've gone soft since last month.",
  "Burn off that jiggly belly.",
];

const ALLOW = [
  "Let's crush it.",
  "No more waiting — go.",
  "Move it, soldier. Squats at 6.",
  "Drop and give me 20, recruit.",
  "Rest day. Recovery is training too.",
  "Healthy fats keep you full longer.",
  "Your fat loss is on track for around Feb 18.",
  "Hit your fat target today: 70 g.",
  "There's no shame in a rest day.",
  "Bring up your weak side with single-leg work.",
  "Trust your gut on the last set.",
  "You never skip leg day. Keep that streak.",
  "You never quit. Same energy today.",
  "Behind on sessions this week. One step for today: get your next planned session in.",
  "Collard greens and chicken for lunch.",
  "Tough session ahead. Own it.",
  "Beat yesterday's numbers.",
  "Slow eccentric on every rep.",
  "Your heavy sets go first.",
  "Oh, we are doing this now? Great. Try to act surprised when it works.",
];

const guardCases = () => {
  for (const t of BLOCK) check(goalCopyHits(t).length > 0, `block: ${t} [${goalCopyHits(t).join(", ")}]`);
  for (const t of ALLOW) check(goalCopyHits(t).length === 0, `allow: ${t}${goalCopyHits(t).length ? ` [${goalCopyHits(t).join(", ")}]` : ""}`);
  check(findShameHits("NO EXCUSES").length > 0, "case-insensitive");
  check(guardGoalCopy(BLOCK[0]!, "SAFE", "test") === "SAFE", "guardGoalCopy swaps the QA reply for safe copy");
};

const promptCases = () => {
  for (const id of TRAINER_PERSONA_IDS) {
    const block = personaPromptBlock(id);
    check(block.includes(COACH_TONE_RULE), `persona ${id}: tone rule in prompt block`);
    check(!/mock excuses|roast the excuse/i.test(block), `persona ${id}: no "mock/roast the excuse" hint`);
  }
  check(coachSystemPrompt({ userId: "u", status: "skipped", persona: "wit" }).includes(COACH_TONE_RULE), "coach system prompt: tone rule");
  check(/drill sergeant/i.test(personaPromptBlock("drill")) && /push limits hard/i.test(personaPromptBlock("drill")), "drill stays intense");
};

let reply = "{}";
globalThis.fetch = (async () =>
  new Response(JSON.stringify({ model: "stub", choices: [{ message: { content: reply } }] }), { status: 200 })) as unknown as typeof fetch;

const coachCases = async () => {
  const env = { OPENAI_API_KEY: "stub" } as unknown as MirraEnv;
  const behind = withStatus(fixtureGoalContext(), "behind");
  for (const persona of TRAINER_PERSONA_IDS) {
    const h = await heuristicCoachAdvisor.advise({ userId: "u", status: "skipped", persona, goal: behind });
    check(goalCopyHits(h.message).length === 0, `heuristic ${persona} behind: clean (${h.message})`);
  }
  reply = JSON.stringify({ message: "Ah, the readiness of a soggy noodle at 2. Let's skip the excuses and do 20 minutes.", rebuildSuggested: true });
  const out = await createOpenAiCoachAdvisor(env).advise({ userId: "u", status: "skipped", persona: "wit", goal: behind });
  check(out.source === "heuristic" && goalCopyHits(out.message).length === 0, `QA reply (wit, behind) → safe heuristic (${out.message})`);
  reply = JSON.stringify({ message: "Up and at it, recruit. Twenty minutes, then done.", rebuildSuggested: false });
  const drill = await createOpenAiCoachAdvisor(env).advise({ userId: "u", status: "partial", persona: "drill", goal: behind });
  check(drill.source === "openai", "intense but clean drill reply kept");
};

const main = async () => {
  guardCases();
  promptCases();
  await coachCases();
  check(BLOCK.length >= 20 && ALLOW.length >= 10, `${BLOCK.length} block / ${ALLOW.length} allow phrases`);
  if (failures) {
    console.error(`\n${failures} failed`);
    process.exit(1);
  }
  console.log("\nassert-tone-guard: all passed");
};

void main();
