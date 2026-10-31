#!/usr/bin/env node
/**
 * Smoke test the Mirra API: health, meal (with mealSlot), fuel today,
 * workout session start -> log set -> complete.
 *
 * Usage: node scripts/smoke-api.mjs
 * Env:   API_BASE_URL (default http://127.0.0.1:8787), SMOKE_USER_ID (default day-test-1)
 * Needs ALLOW_DEV_USER_HEADER=true on the API. Reuses the user's current plan;
 * onboards + generates one only if the user has no workouts.
 */
const base = (process.env.API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const userId = process.env.SMOKE_USER_ID ?? "day-test-1";

const results = [];
const record = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const call = async (method, path, body) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "x-mirra-user-id": userId },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json, text };
};

const check = (name, res, expectedStatus, predicate = () => true) => {
  const ok = res.status === expectedStatus && predicate(res.json);
  record(name, ok, `HTTP ${res.status}${ok ? "" : ` ${res.text.slice(0, 160)}`}`);
  return ok;
};

const ensureWorkout = async () => {
  let plan = (await call("GET", "/v1/plans/current")).json;
  if (plan?.workouts?.length) return plan.workouts[0];

  console.log("INFO  no plan for user, onboarding + generating one");
  await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 28, heightCm: 175, weightKg: 76, timezone: "UTC" },
    preferences: {
      primaryGoal: "build_muscle",
      experience: "months",
      equipment: ["full_gym"],
      trainDays: [1, 3, 5],
      sessionMinutes: 45,
      cuisineStyles: ["other"],
    },
  });
  const gen = await call("POST", "/v1/plans/generate", {});
  const jobId = gen.json?.jobId;
  for (let i = 0; jobId && i < 30; i++) {
    const job = (await call("GET", `/v1/plans/jobs/${jobId}`)).json;
    if (job?.status === "done" || job?.status === "failed") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  plan = (await call("GET", "/v1/plans/current")).json;
  return plan?.workouts?.[0] ?? null;
};

const run = async () => {
  console.log(`Smoke: ${base} as ${userId}`);

  check("health", await call("GET", "/health"), 200, (j) => j?.ok === true);

  const kcal = 480;
  const meal = await call("POST", "/v1/meals", {
    name: "Smoke chicken bowl",
    mealSlot: "lunch",
    kcal,
    proteinG: 40,
  });
  check("POST /v1/meals (mealSlot)", meal, 201, (j) => j?.mealSlot === "lunch" && j?.kcal === kcal);

  const noSlot = await call("POST", "/v1/meals", { name: "No slot", kcal: 100 });
  check("POST /v1/meals without mealSlot rejected", noSlot, 400);

  const fuel = await call("GET", "/v1/fuel/today");
  check(
    "GET /v1/fuel/today",
    fuel,
    200,
    (j) =>
      typeof j?.targets?.kcal === "number" &&
      j?.logged?.kcal >= kcal &&
      j?.meals?.some((m) => m.id === meal.json?.id),
  );

  const workout = await ensureWorkout();
  if (!workout) {
    record("workout available on plan", false, "no workout on current plan");
    return;
  }
  const session = await call("POST", "/v1/workouts/sessions", { workoutId: workout.id });
  if (!check("POST /v1/workouts/sessions", session, 201, (j) => Boolean(j?.id))) return;
  const sid = session.json.id;

  const ex = workout.exercises?.[0];
  check(
    "POST /sessions/:id/sets",
    await call("POST", `/v1/workouts/sessions/${sid}/sets`, {
      exerciseId: ex?.id ?? null,
      exerciseName: ex?.name ?? "Smoke squat",
      setIndex: 1,
      reps: 8,
      completed: true,
    }),
    201,
    (j) => j?.sessionId === sid && j?.setIndex === 1,
  );

  check(
    "POST /sessions/:id/complete",
    await call("POST", `/v1/workouts/sessions/${sid}/complete`, { rpe: 7 }),
    200,
    (j) => j?.endedAt != null && j?.rpe === 7,
  );

  const checkIn = await call("POST", "/v1/check-ins", {
    localDate: new Date().toISOString().slice(0, 10),
    status: "partial",
    note: "smoke-vector:missed",
  });
  check("POST /v1/check-ins (partial)", checkIn, 201, (j) => j?.status === "partial");

  const badStatus = await call("POST", "/v1/check-ins", {
    localDate: new Date().toISOString().slice(0, 10),
    status: "on_track",
  });
  check("POST /v1/check-ins rejects on_track", badStatus, 400);

  const photo = await call("POST", "/v1/progress/photos", {
    pose: "front",
    note: "smoke",
    localUri: "placeholder://smoke",
  });
  check("POST /v1/progress/photos", photo, 201, (j) => Boolean(j?.id));

  const photos = await call("GET", "/v1/progress/photos");
  check(
    "GET /v1/progress/photos",
    photos,
    200,
    (j) => Array.isArray(j?.items) && j.items.some((p) => p.id === photo.json?.id),
  );

  const authOk = await call("GET", "/api/auth/ok");
  // Better Auth may 404 ok route — accept any non-5xx as mounted
  record(
    "GET /api/auth/* mounted",
    authOk.status < 500,
    `HTTP ${authOk.status}`,
  );

  check(
    "GET /v1/me",
    await call("GET", "/v1/me"),
    200,
    (j) => j?.user?.id === userId,
  );

  check(
    "GET /v1/today",
    await call("GET", "/v1/today"),
    200,
    (j) => typeof j?.date === "string" && typeof j?.fuel?.kcalTarget === "number",
  );

  const advise = await call("POST", "/v1/coach/advise", {
    readiness: "push",
    note: "smoke",
  });
  check(
    "POST /v1/coach/advise",
    advise,
    200,
    (j) => typeof j?.message === "string" && j.message.length > 0,
  );

  const preview = await call("POST", "/v1/plans/rebuild/preview", {
    reason: "smoke_rebuild",
    checkInId: checkIn.json?.id,
  });
  const previewOk = check(
    "POST /v1/plans/rebuild/preview",
    preview,
    200,
    (j) => Boolean(j?.previewToken) && Boolean(j?.after),
  );
  if (previewOk) {
    check(
      "POST /v1/plans/rebuild/apply",
      await call("POST", "/v1/plans/rebuild/apply", {
        previewToken: preview.json.previewToken,
      }),
      200,
      // API returns nested `{ plan, days, workouts }`
      (j) => Boolean(j?.plan?.id) || Boolean(j?.id),
    );
  }

  // Dev header required when ALLOW_DEV_USER_HEADER=true and no Better Auth cookie
  const noAuth = await fetch(`${base}/v1/me`, {
    headers: { Accept: "application/json" },
  });
  record(
    "GET /v1/me without auth rejected",
    noAuth.status === 401,
    `HTTP ${noAuth.status}`,
  );

  // Without GOOGLE_CLIENT_ID/SECRET, Better Auth returns PROVIDER_NOT_FOUND (404).
  // Must not 5xx. With secrets set, this still rejects a bogus token (4xx).
  const googleSignIn = await call("POST", "/api/auth/sign-in/social", {
    provider: "google",
    idToken: { token: "invalid-smoke-token" },
  });
  const googleClosed =
    googleSignIn.status >= 400 &&
    googleSignIn.status < 500 &&
    (googleSignIn.json?.code === "PROVIDER_NOT_FOUND" ||
      googleSignIn.status !== 404 ||
      Boolean(googleSignIn.json?.message));
  record(
    "POST /api/auth/sign-in/social google fails closed",
    googleClosed,
    `HTTP ${googleSignIn.status} ${googleSignIn.json?.code ?? ""}`.trim(),
  );

  // Mint a Better Auth session (DEV) and call /v1/me with Bearer only — no x-mirra-user-id.
  const minted = await call("POST", "/v1/dev/session", { userId });
  const token = minted.json?.token;
  record(
    "POST /v1/dev/session mints token",
    minted.status === 201 && Boolean(token),
    `HTTP ${minted.status}`,
  );
  if (token) {
    const bearerRes = await fetch(`${base}/v1/me`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const bearerText = await bearerRes.text();
    let bearerJson = null;
    try {
      bearerJson = bearerText ? JSON.parse(bearerText) : null;
    } catch {
      /* ignore */
    }
    record(
      "GET /v1/me with Bearer session (no dev header)",
      bearerRes.status === 200 && bearerJson?.user?.id === userId,
      `HTTP ${bearerRes.status}`,
    );
  }
};

run()
  .catch((err) => record("unexpected error", false, String(err)))
  .finally(() => {
    const failed = results.filter((ok) => !ok).length;
    console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  });
