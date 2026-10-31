#!/usr/bin/env node
/**
 * Smoke: trainer personas (onboard + PATCH + POST /v1/coach/advise).
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-trainer-persona.mjs
 * Local only by default. Uses a fresh dev user (x-mirra-user-id).
 */
const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const USER = process.env.SMOKE_USER ?? `smoke-persona-${Date.now()}`;
const PERSONAS = ["drill", "honey", "wit", "spark", "zen", "rival"];
const BAD_COPY = /[\u2014\u2013;]|--/;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const call = async (method, path, body, user = USER) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const onboardBody = (trainerPersona) => ({
  profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, timezone: "UTC" },
  preferences: {
    primaryGoal: "build_muscle",
    experience: "months",
    equipment: ["full_gym", "dumbbells"],
    trainDays: [1, 3, 5],
    sessionMinutes: 45,
    dietTags: [],
    foodsAvoid: null,
    cuisineStyles: ["other"],
    units: "metric",
    ...(trainerPersona ? { trainerPersona } : {}),
  },
});

const replies = {};

const main = async () => {
  console.log(`API_BASE=${BASE} user=${USER}`);

  // Default when unset.
  const first = await call("PUT", "/v1/onboarding", onboardBody(undefined));
  check(first.status === 200, "onboard without persona", `status ${first.status}`);
  const me0 = await call("GET", "/v1/me");
  check(me0.json?.preferences?.trainerPersona === "drill", "default persona is drill", me0.json?.preferences?.trainerPersona);

  // Invalid values are rejected.
  const bad = await call("PATCH", "/v1/me/preferences", { trainerPersona: "pirate" });
  check(bad.status === 400, "PATCH rejects unknown persona", `status ${bad.status}`);

  for (const [i, id] of PERSONAS.entries()) {
    // Alternate: onboard on even, PATCH on odd.
    const set = i % 2 === 0
      ? await call("PUT", "/v1/onboarding", onboardBody(id))
      : await call("PATCH", "/v1/me/preferences", { trainerPersona: id });
    check(set.status === 200, `${id}: set via ${i % 2 === 0 ? "onboarding" : "PATCH"}`, `status ${set.status}`);

    const me = await call("GET", "/v1/me");
    check(me.json?.preferences?.trainerPersona === id, `${id}: GET /v1/me returns persona`, me.json?.preferences?.trainerPersona);

    const adv = await call("POST", "/v1/coach/advise", { status: "partial", readiness: "push" });
    const msg = adv.json?.message ?? "";
    check(adv.status === 200, `${id}: coach advise 200`, `status ${adv.status}`);
    check(typeof msg === "string" && msg.trim().length > 0, `${id}: message non-empty`);
    check(!BAD_COPY.test(msg), `${id}: no em dash / semicolon`, msg.slice(0, 90));
    replies[id] = { msg, source: adv.json?.source };
  }

  const sources = new Set(Object.values(replies).map((r) => r.source));
  const unique = new Set(Object.values(replies).map((r) => r.msg));
  console.log(`INFO  sources=${[...sources].join(",")}  unique replies=${unique.size}/${PERSONAS.length}`);
  check(replies.drill.msg !== replies.honey.msg, "drill reply differs from honey");
  check(unique.size === PERSONAS.length, "all 6 replies distinct");

  const revise = await call("POST", "/v1/coach/revise", { message: "no cable machines", dryRun: true });
  check(revise.status === 200, "revise (persona wired) 200", `status ${revise.status}`);
  check(!BAD_COPY.test(revise.json?.message ?? ""), "revise reply clean", revise.json?.message);

  // Last persona set above is "rival": voice cue greeting must carry it.
  const voice = await call("GET", "/v1/voice/cue/today");
  check(voice.status === 200, "voice cue 200", `status ${voice.status}`);
  check(!BAD_COPY.test(voice.json?.text ?? ""), "voice cue clean", voice.json?.text);
  check(/challenger/i.test(voice.json?.text ?? ""), "voice cue uses rival greeting", voice.json?.text);

  for (const id of PERSONAS) console.log(`SAMPLE ${id.padEnd(6)} ${replies[id]?.msg}`);
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
