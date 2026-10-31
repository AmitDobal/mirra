#!/usr/bin/env node
/**
 * Smoke: AI budget + voice cue.
 *   API_BASE=https://mirra-api.amit-dobalwork.workers.dev node scripts/smoke-ai-budget-voice.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (fresh dev user = free tier).
 * Covers: usage 200, chip revise stays heuristic (no token spend), voice cue 200 with text,
 * voice daily cap (free = 3) returns 429.
 */
const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const USER = process.env.SMOKE_USER ?? `smoke-ai-budget-${Date.now()}`;
const FREE_VOICE_CAP = 3;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": USER },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
};

const main = async () => {
  console.log(`API ${BASE} user ${USER}`);

  const usage = await call("GET", "/v1/ai/usage");
  check(usage.status === 200, "GET /v1/ai/usage", `status ${usage.status}`);
  check(usage.json?.tier === "free", "tier is free", String(usage.json?.tier));
  check(usage.json?.features?.voice?.limit === FREE_VOICE_CAP, "voice limit", JSON.stringify(usage.json?.features?.voice));
  const tokensBefore = usage.json?.monthTokensUsed ?? -1;

  const onboard = await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym", "dumbbells"],
      trainDays: [1, 2, 3, 4, 5, 6, 7],
      sessionMinutes: 45,
      dietTags: [],
      foodsAvoid: null,
      cuisineStyles: ["other"],
      units: "metric",
    },
  });
  check(onboard.status === 200, "onboarding", `status ${onboard.status}`);

  const chip = await call("POST", "/v1/coach/revise", { message: "no dairy", scope: "auto", dryRun: true });
  check(chip.status === 200, "revise chip 'no dairy'", `status ${chip.status}`);
  check(chip.json?.source === "heuristic", "chip stays heuristic", String(chip.json?.source));

  const after = await call("GET", "/v1/ai/usage");
  check(after.json?.monthTokensUsed === tokensBefore, "chip spent 0 tokens", `${tokensBefore} -> ${after.json?.monthTokensUsed}`);
  check(after.json?.features?.revise?.used === 0, "chip not counted against revise LLM cap");

  const cue = await call("GET", "/v1/voice/cue/today");
  check(cue.status === 200, "GET /v1/voice/cue/today", `status ${cue.status}`);
  const text = cue.json?.text ?? "";
  check(text.length > 0 && text.length <= 180, "cue has text <=180 chars", `"${text}" (${text.length})`);
  console.log(`      audio=${cue.json?.audioBase64 ? "yes" : "no (text-only)"} cached=${cue.json?.cached} remaining=${cue.json?.remaining}`);

  const hasAudio = Boolean(cue.json?.audioBase64);
  const statuses = [cue.status];
  for (let i = 0; i < FREE_VOICE_CAP + 1; i += 1) {
    statuses.push((await call("GET", "/v1/voice/cue/today")).status);
  }
  const end = await call("GET", "/v1/ai/usage");
  if (hasAudio) {
    check(statuses.includes(429), "cloud TTS cap enforced (429)", statuses.join(","));
    check(
      statuses.filter((s) => s === 200).length === FREE_VOICE_CAP,
      `exactly ${FREE_VOICE_CAP} paid cues served`,
      statuses.join(","),
    );
    check(end.json?.features?.voice?.used === FREE_VOICE_CAP, "usage shows voice cap used", JSON.stringify(end.json?.features?.voice));
  } else {
    // Text-only (device TTS): free — never 429, never burn voice_tts.
    check(statuses.every((s) => s === 200), "text-only cues stay 200", statuses.join(","));
    check(end.json?.features?.voice?.used === 0, "text-only does not burn voice cap", JSON.stringify(end.json?.features?.voice));
  }

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
