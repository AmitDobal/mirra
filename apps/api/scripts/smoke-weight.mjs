#!/usr/bin/env node
/**
 * Smoke: body-weight logging.
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-weight.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (fresh x-mirra-user-id per run).
 *
 * W1 onboard (weightKg 80) -> POST 78.4 then 77.9 -> 201 with { id, kg, loggedAt }
 * W2 GET /v1/weight -> newest first, both rows present
 * W3 GET /v1/me profile.weightKg === latest logged kg
 * W4 validation: kg 29 / 401 / missing -> 400; limit clamps (limit=9999 ok)
 */
const BASE = (process.env.API_BASE ?? "https://mirra-api.amit-dobalwork.workers.dev").replace(/\/$/, "");
const USER = process.env.SMOKE_USER ?? `smoke-weight-${Date.now()}`;

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const call = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": USER },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const main = async () => {
  console.log(`API ${BASE} user ${USER}`);

  const onboard = await call("PUT", "/v1/onboarding", {
    profile: { sex: "male", ageYears: 30, heightCm: 178, weightKg: 80, goalWeightKg: 74, timezone: "UTC" },
    preferences: {
      primaryGoal: "lose_fat",
      experience: "months",
      equipment: ["full_gym", "dumbbells"],
      trainDays: [1, 3, 5],
      sessionMinutes: 45,
      dietTags: [],
      foodsAvoid: null,
      cuisineStyles: ["indian"],
      units: "metric",
    },
  });
  check(onboard.status === 200, "W1 onboarding -> 200", `status ${onboard.status}`);

  const now = Date.now();
  const first = await call("POST", "/v1/weight", { kg: 78.4, loggedAt: now - 86_400_000 });
  const second = await call("POST", "/v1/weight", { kg: 77.9, loggedAt: now });
  check(
    first.status === 201 && typeof first.json?.id === "string" && first.json.kg === 78.4,
    "W1 POST first weight -> 201",
    JSON.stringify(first.json),
  );
  check(second.status === 201 && second.json?.kg === 77.9, "W1 POST second weight -> 201", JSON.stringify(second.json));

  const list = await call("GET", "/v1/weight");
  const items = list.json?.items ?? [];
  check(list.status === 200 && items.length === 2, "W2 GET /v1/weight -> 2 items", `status ${list.status}, ${items.length} items`);
  check(items[0]?.kg === 77.9 && items[1]?.kg === 78.4, "W2 newest first", items.map((i) => i.kg).join(","));
  check(items.every((i) => i.id && typeof i.loggedAt === "number"), "W2 items shaped { id, kg, loggedAt }");

  const limited = await call("GET", "/v1/weight?limit=1");
  check(limited.json?.items?.length === 1 && limited.json.items[0].kg === 77.9, "W2 limit=1 -> newest only");
  const big = await call("GET", "/v1/weight?limit=9999");
  check(big.status === 200, "W2 limit=9999 clamps", `status ${big.status}`);

  const me = await call("GET", "/v1/me");
  check(me.json?.profile?.weightKg === 77.9, "W3 /v1/me profile.weightKg = latest", String(me.json?.profile?.weightKg));

  for (const [label, body] of [["kg 29", { kg: 29 }], ["kg 401", { kg: 401 }], ["missing kg", {}]]) {
    const res = await call("POST", "/v1/weight", body);
    check(res.status === 400, `W4 ${label} -> 400`, `status ${res.status}`);
  }

  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
