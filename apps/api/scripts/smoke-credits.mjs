#!/usr/bin/env node
/**
 * Smoke: AI credits (AMI-125).
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-credits.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (uses /v1/credits/dev/*). Works in any AI_CREDITS_MODE:
 * shadow asserts "never blocks", enforce asserts 402/429 hard caps.
 * Optional: SMOKE_EXPECT_OPENAI=1 when the API has an OPENAI_API_KEY → real coach route gets 402.
 */
const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const RUN = Date.now();
let failures = 0;

const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const call = async (user, method, path, body, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-mirra-user-id": user, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

const credits = async (u) => (await call(u, "GET", "/v1/credits")).json;
const spend = (u, feature = "coach", extra = {}) => call(u, "POST", "/v1/credits/dev/spend", { feature, ...extra });
const user = (name) => `smoke-credits-${name}-${RUN}`;

const main = async () => {
  console.log(`API ${BASE}`);
  const a = user("a");
  const first = await call(a, "GET", "/v1/credits");
  check(first.status === 200, "GET /v1/credits", `status ${first.status}`);
  const c0 = first.json;
  const enforce = c0.mode === "enforce";
  console.log(`      mode=${c0.mode} tier=${c0.tier} granted=${c0.granted} cap=${c0.absoluteCap}`);
  check(c0.tier === "free" && c0.granted > 0 && c0.remaining === c0.granted, "new user: free grant, remaining = granted");
  check(c0.costs.coach === 1 && c0.costs.plan_gen === 5 && c0.costs.meal_plan === 3, "costs table present");
  check(c0.warnings.length === 0, "no warnings at start");
  const again = await credits(a);
  check(again.granted === c0.granted, "grant is idempotent across reads", `${again.granted}`);

  // --- provider error / heuristic fallback cost nothing ---------------------------------
  const err = await spend(a, "coach", { outcome: "error" });
  check(err.status === 500, "provider error surfaces", `status ${err.status}`);
  const heur = await spend(a, "coach", { outcome: "heuristic" });
  const c1 = await credits(a);
  check(heur.status === 200 && c1.spent === 0 && c1.reserved === 0 && c1.remaining === c0.granted,
    "error + heuristic outcome: balance unchanged, no open hold", `spent=${c1.spent} reserved=${c1.reserved}`);

  // --- user isolation ---------------------------------------------------------------------
  const b = user("b");
  await spend(a, "coach");
  const cb = await credits(b);
  const ca = await credits(a);
  check(ca.spent === 1 && cb.spent === 0 && cb.remaining === cb.granted, "user B unaffected by user A's spend");

  // --- drain to zero ------------------------------------------------------------------------
  for (let i = 0; i < c0.granted - 1; i++) await spend(a, "coach");
  const drained = await credits(a);
  check(drained.spent === c0.granted && drained.remaining === 0, "spent exactly the grant", `spent=${drained.spent}`);
  check(drained.warnings.includes("out_of_credits"), "out_of_credits warning at 0");
  const over = await spend(a, "coach");
  if (enforce) {
    check(over.status === 402 && over.json?.error?.code === "ai_credits_exhausted", "empty balance → 402", `status ${over.status}`);
    check(over.json?.error?.heuristicAvailable === true && Boolean(over.json?.error?.resetsAt), "402 carries resetsAt + heuristicAvailable");
    const coachHeur = await call(a, "POST", "/v1/coach/advise", { status: "partial" }, { "x-mirra-ai-mode": "heuristic" });
    check(coachHeur.status === 200 && coachHeur.json?.source !== "openai", "coach heuristic fallback still 200 at 0 credits", `status ${coachHeur.status}`);
    if (process.env.SMOKE_EXPECT_OPENAI) {
      const coach = await call(a, "POST", "/v1/coach/advise", { status: "partial" });
      check(coach.status === 402, "real coach route gated → 402", `status ${coach.status}`);
    }
  } else {
    check(over.status === 200, "shadow mode never blocks past zero", `status ${over.status}`);
  }

  // --- parallel requests cannot overspend (enforce) -------------------------------------
  const p = user("par");
  const grant = (await credits(p)).granted;
  const results = await Promise.all(Array.from({ length: grant + 12 }, () => spend(p, "coach")));
  const ok = results.filter((r) => r.status === 200).length;
  const cp = await credits(p);
  if (enforce) {
    check(ok === grant && cp.spent === grant && cp.reserved === 0, "parallel: exactly `grant` succeed, none over", `ok=${ok} spent=${cp.spent}`);
  } else {
    check(ok === grant + 12, "parallel shadow: all succeed", `ok=${ok}`);
  }

  // --- hard action cap (plan_gen free = 2/month) + USD cap ---------------------------------
  const cap = user("cap");
  await spend(cap, "plan_gen");
  await spend(cap, "plan_gen");
  const third = await spend(cap, "plan_gen");
  if (enforce) {
    const room = (await credits(cap)).remaining >= 5;
    check(third.status === 429 && third.json?.error?.code === "ai_action_cap", "3rd free plan_gen → 429 ai_action_cap", `status ${third.status} room=${room}`);
  } else {
    check(third.status === 200, "shadow: plan_gen cap never blocks");
  }

  const usd = user("usd");
  await spend(usd, "coach", { estimatedMicros: 900_000 });
  const usdNext = await spend(usd, "coach");
  const cu = await credits(usd);
  if (enforce) {
    check(usdNext.status === 429 && usdNext.json?.error?.code === "ai_spend_cap", "monthly USD cap → 429 ai_spend_cap even with credits left", `remaining=${cu.remaining}`);
  } else {
    check(usdNext.status === 200 && cu.warnings.includes("spend_cap_near"), "shadow: USD cap never blocks, warns");
  }

  // --- pro mapping --------------------------------------------------------------------------
  const pro = user("pro");
  const before = await credits(pro);
  await call(pro, "POST", "/v1/credits/dev/entitlement", { status: "active" });
  const upgraded = await credits(pro);
  check(upgraded.tier === "pro" && upgraded.granted > before.granted, "RevenueCat pro → larger monthly grant", `${before.granted} → ${upgraded.granted}`);
  const upgraded2 = await credits(pro);
  check(upgraded2.granted === upgraded.granted, "pro top-up applied once");

  // --- referral stub -----------------------------------------------------------------------
  const ref = await call(a, "GET", "/v1/credits/referral");
  check(ref.status === 200 && /^[A-Z0-9]{8}$/.test(ref.json?.code ?? ""), "referral code created", ref.json?.code);
  const ref2 = await call(a, "GET", "/v1/credits/referral");
  check(ref2.json?.code === ref.json?.code, "referral code is stable");
  const self = await call(a, "POST", "/v1/credits/referral/redeem", { code: ref.json.code });
  check(self.status === 400, "self-redeem rejected", `status ${self.status}`);
  const bad = await call(b, "POST", "/v1/credits/referral/redeem", { code: "ZZZZZZZZ" });
  check(bad.status === 404, "unknown code → 404", `status ${bad.status}`);
  const redeem = await call(b, "POST", "/v1/credits/referral/redeem", { code: ref.json.code });
  check(redeem.status === 200 && redeem.json?.status === "pending" && redeem.json?.creditsAwarded === 0, "redeem stays pending (top-up off by default)", JSON.stringify(redeem.json));
  const dup = await call(b, "POST", "/v1/credits/referral/redeem", { code: ref.json.code });
  check(dup.status === 409, "double redeem rejected", `status ${dup.status}`);
  const afterRef = await credits(a);
  check(afterRef.bonus === 0, "no bonus awarded while REFERRAL_TOPUP_ENABLED is off");

  const dev = await call(a, "GET", "/v1/ai/usage");
  check(dev.status === 200 && typeof dev.json?.monthTokensUsed === "number", "GET /v1/ai/usage still works");

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
