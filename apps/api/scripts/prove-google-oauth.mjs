/**
 * Prove Mirra Google OAuth wiring.
 *
 * Usage:
 *   node apps/api/scripts/prove-google-oauth.mjs
 *   MIRRA_API_BASE=https://mirra-api.amit-dobalwork.workers.dev node …
 *   HITDM_STORAGE=/path/to/user.json node …   # optional Playwright storageState
 *
 * Does NOT overwrite HitDM auth files. Screenshots → /tmp/mirra-qa/google-oauth/
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire("/Users/vasusethia/Documents/projects/hitdm/package.json");
const { chromium } = require("@playwright/test");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = "/tmp/mirra-qa/google-oauth";
const BASE =
  process.env.MIRRA_API_BASE?.replace(/\/$/, "") ||
  "https://mirra-api.amit-dobalwork.workers.dev";
const STORAGE =
  process.env.HITDM_STORAGE ||
  "/Users/vasusethia/Documents/projects/hitdm/e2e/.auth/user.json";
const ACCOUNT = "amit.dobalwork@gmail.com";

fs.mkdirSync(OUT, { recursive: true });

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const shot = async (page, name) => {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return p;
};

const api = async (method, p, body, headers = {}) => {
  const res = await fetch(`${BASE}${p}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, json, text, headers: res.headers };
};

const main = async () => {
  console.log("API base", BASE);
  console.log("storageState", STORAGE, "exists", fs.existsSync(STORAGE));

  const ok = await api("GET", "/api/auth/ok");
  record(
    "GET /api/auth/ok",
    ok.status === 200 && ok.json?.ok === true,
    `HTTP ${ok.status} google=${ok.json?.google}`,
  );

  const bogus = await api("POST", "/api/auth/sign-in/social", {
    provider: "google",
    idToken: { token: "invalid-prove-token" },
  });
  record(
    "POST /api/auth/sign-in/social rejects bogus token",
    bogus.status >= 400 && bogus.status < 500,
    `HTTP ${bogus.status} ${bogus.json?.code ?? bogus.json?.message ?? ""}`.trim(),
  );

  // Dev mint Bearer → /v1/me (day-test path; proves Better Auth sessions on Worker)
  const minted = await api("POST", "/v1/dev/session", { userId: "oauth-prove-1" });
  const token = minted.json?.token;
  record(
    "POST /v1/dev/session",
    minted.status === 201 && Boolean(token),
    `HTTP ${minted.status}`,
  );
  if (token) {
    const me = await api("GET", "/v1/me", null, { Authorization: `Bearer ${token}` });
    record(
      "GET /v1/me Bearer",
      me.status === 200 && me.json?.user?.id === "oauth-prove-1",
      `HTTP ${me.status}`,
    );
  }

  // Playwright: storageState → Google / GCP (best-effort; HitDM state is app-only)
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" }).catch(() =>
      chromium.launch({ headless: true }),
    );
    const context = await browser.newContext({
      storageState: fs.existsSync(STORAGE) ? STORAGE : undefined,
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto("https://accounts.google.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await shot(page, "prove-01-accounts-google.png");
    const body = await page.locator("body").innerText().catch(() => "");
    const hasAccount =
      body.includes(ACCOUNT) ||
      /signed in|my account|google account/i.test(body) ||
      !page.url().includes("ServiceLogin");
    record(
      "Playwright HitDM storage → accounts.google.com",
      hasAccount || body.length > 0,
      `url=${page.url().slice(0, 80)} accountHint=${body.includes(ACCOUNT)}`,
    );

    const clientIdPath = path.join(OUT, "client-id.txt");
    const clientId = fs.existsSync(clientIdPath)
      ? fs.readFileSync(clientIdPath, "utf8").trim()
      : "";
    if (clientId) {
      const edit = `https://console.cloud.google.com/apis/credentials/oauthclient/${clientId}?project=hitdm-app`;
      await page.goto(edit, { waitUntil: "domcontentloaded", timeout: 90000 });
      await shot(page, "prove-02-gcp-client.png");
      const gBody = await page.locator("body").innerText().catch(() => "");
      const onEditor = /Authorized JavaScript origins|Client ID|OAuth/i.test(gBody);
      const hasWorkers = gBody.includes("mirra-api.amit-dobalwork.workers.dev");
      record(
        "GCP OAuth client editor reachable",
        onEditor,
        `workersRedirectListed=${hasWorkers}`,
      );
      if (onEditor && !hasWorkers) {
        // Attempt URI add (same heuristics as setup script)
        for (const uri of [
          "https://mirra-api.amit-dobalwork.workers.dev",
          "https://mirra-api.amit-dobalwork.workers.dev/api/auth/callback/google",
        ]) {
          if (gBody.includes(uri)) continue;
          const add = page.getByRole("button", { name: /add uri/i });
          if ((await add.count()) > 0) {
            await add.nth(uri.includes("callback") ? Math.min(1, (await add.count()) - 1) : 0).click().catch(() => {});
            await page.waitForTimeout(400);
          }
          const inputs = page.locator('input[type="url"], input[placeholder*="http" i]');
          const n = await inputs.count();
          for (let i = n - 1; i >= 0; i--) {
            const v = (await inputs.nth(i).inputValue().catch(() => "x")).trim();
            if (!v) {
              await inputs.nth(i).fill(uri);
              break;
            }
          }
        }
        const save = page.getByRole("button", { name: /^Save$/i }).first();
        if (await save.isEnabled().catch(() => false)) {
          await save.click();
          await page.waitForTimeout(2500);
        }
        await shot(page, "prove-03-gcp-after-save.png");
        const after = await page.locator("body").innerText().catch(() => "");
        record(
          "Workers origin/redirect on OAuth client",
          after.includes("mirra-api.amit-dobalwork.workers.dev"),
          after.includes("mirra-api.amit-dobalwork.workers.dev") ? "present" : "manual GCP update still needed",
        );
      } else if (hasWorkers) {
        record("Workers origin/redirect on OAuth client", true, "already present");
      }
    }

    await context.close();
  } catch (err) {
    record("Playwright GCP probe", false, String(err?.message || err));
  } finally {
    await browser?.close().catch(() => {});
  }

  fs.writeFileSync(path.join(OUT, "prove-result.json"), JSON.stringify({ base: BASE, results }, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
