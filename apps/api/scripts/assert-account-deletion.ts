/**
 * Proves deleteAccount() against LOCAL D1 + LOCAL R2 (miniflare via wrangler).
 *   npm run db:migrate:local -w @mirra/api   # once
 *   npm run test:account-delete -w @mirra/api
 */
import assert from "node:assert/strict";

import { getPlatformProxy } from "wrangler";

import { createR2ObjectStore } from "../src/adapters/r2-object-store";
import { createDb } from "../src/db";
import { deleteAccount } from "../src/services/account-deletion";

type Env = { DB: D1Database; MEDIA: R2Bucket };

const run = async () => {
  const proxy = await getPlatformProxy<Env>({ configPath: "wrangler.jsonc" });
  const { DB, MEDIA } = proxy.env;
  const store = createR2ObjectStore(MEDIA);
  const db = createDb(DB);

  const tag = Date.now().toString(36);
  const victim = `del-victim-${tag}`;
  const bystander = `del-bystander-${tag}`;
  const now = Date.now();

  const exec = async (sql: string, ...args: unknown[]) => {
    await DB.prepare(sql).bind(...args).run();
  };
  const count = async (sql: string, ...args: unknown[]) =>
    (await DB.prepare(sql).bind(...args).first<{ n: number }>())?.n ?? -1;

  const seed = async (uid: string) => {
    await exec("INSERT INTO users (id, name) VALUES (?, ?)", uid, `t:${uid}`);
    await exec("INSERT INTO sessions (id, expires_at, token, user_id) VALUES (?, ?, ?, ?)", `s-${uid}`, now + 1e6, `tok-${uid}`, uid);
    await exec("INSERT INTO plans (id, user_id, version, status, week_start, source) VALUES (?, ?, 1, 'active', '2026-11-02', 'test')", `p-${uid}`, uid);
    await exec("INSERT INTO meals (id, user_id, eaten_at, name, meal_slot, kcal) VALUES (?, ?, ?, 'x', 'lunch', 100)", `m-${uid}`, uid, now);
    const key = `meal/${uid}/m1`;
    await exec("INSERT INTO media_objects (id, user_id, kind, r2_key, content_type) VALUES (?, ?, 'meal', ?, 'image/jpeg')", `mo-${uid}`, uid, key);
    await MEDIA.put(key, "bytes");
    await MEDIA.put(`progress/${uid}/orphan`, "orphan"); // no media_objects row
    await exec("INSERT INTO ai_usage_events (id, user_id, feature, provider) VALUES (?, ?, 'chef', 'stub')", `ue-${uid}`, uid);
    await exec("INSERT INTO ai_usage_daily (user_id, day, feature) VALUES (?, '2026-11-01', 'chef')", uid);
    await exec("INSERT INTO ai_credit_periods (user_id, period) VALUES (?, '2026-11')", uid);
    await exec("INSERT INTO ai_credit_reservations (id, user_id, period, feature, credits_reserved, status, mode, expires_at) VALUES (?, ?, '2026-11', 'chef', 1, 'held', 'x', ?)", `r-${uid}`, uid, now + 1e6);
    await exec("INSERT INTO ai_credit_ledger (id, user_id, period, delta, kind) VALUES (?, ?, '2026-11', 5, 'grant')", `l-${uid}`, uid);
    await exec("INSERT INTO referral_codes (user_id, code) VALUES (?, ?)", uid, `CODE${uid}`);
    await exec("INSERT INTO audit_log (id, user_id, action) VALUES (?, ?, 'test')", `a-${uid}`, uid);
    await exec("INSERT INTO payment_events (id, user_id, type) VALUES (?, ?, 'test.paid')", `pe-${uid}`, uid);
  };

  await seed(victim);
  await seed(bystander);
  await exec("INSERT INTO referral_redemptions (id, referrer_user_id, referee_user_id, status) VALUES (?, ?, ?, 'awarded')", `rr-${tag}`, bystander, victim);

  assert.equal(await count("SELECT COUNT(*) n FROM users WHERE id = ?", victim), 1);
  assert.ok(await MEDIA.head(`meal/${victim}/m1`));
  console.log("ok  seeded victim + bystander (D1 + R2)");

  const first = await deleteAccount(db, store, victim);
  assert.equal(first.mediaKeys, 1);
  console.log("ok  deleteAccount ran", first);

  // Every table with a user_id-ish column must have zero rows for the victim.
  const userCols = ["user_id", "referrer_user_id", "referee_user_id"];
  const names = (
    await DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_cf%' ESCAPE '\\' AND name != 'payment_events'").all<{ name: string }>()
  ).results.map((r) => r.name);
  const tables: { t: string; c: string }[] = [];
  for (const t of names) {
    const cols = (await DB.prepare(`PRAGMA table_info("${t}")`).all<{ name: string }>()).results;
    for (const col of cols) if (userCols.includes(col.name)) tables.push({ t, c: col.name });
  }
  assert.ok(tables.length > 15, `expected many user tables, got ${tables.length}`);
  for (const { t, c } of tables) {
    assert.equal(await count(`SELECT COUNT(*) n FROM "${t}" WHERE "${c}" = ?`, victim), 0, `${t}.${c} still has victim rows`);
  }
  assert.equal(await count("SELECT COUNT(*) n FROM users WHERE id = ?", victim), 0);
  assert.equal(await count("SELECT COUNT(*) n FROM sessions WHERE user_id = ?", victim), 0);
  console.log(`ok  users + ${tables.length} user-scoped columns clean`);

  assert.equal(await MEDIA.head(`meal/${victim}/m1`), null);
  assert.equal(await MEDIA.head(`progress/${victim}/orphan`), null);
  console.log("ok  R2 tracked + orphan objects gone");

  assert.equal(await count("SELECT COUNT(*) n FROM payment_events WHERE id = ? AND user_id IS NULL", `pe-${victim}`), 1);
  console.log("ok  payment_events kept, user_id anonymized");

  assert.equal(await count("SELECT COUNT(*) n FROM users WHERE id = ?", bystander), 1);
  assert.equal(await count("SELECT COUNT(*) n FROM meals WHERE user_id = ?", bystander), 1);
  assert.equal(await count("SELECT COUNT(*) n FROM ai_credit_ledger WHERE user_id = ?", bystander), 1);
  assert.equal(await count("SELECT COUNT(*) n FROM payment_events WHERE user_id = ?", bystander), 1);
  assert.ok(await MEDIA.head(`meal/${bystander}/m1`));
  console.log("ok  bystander untouched");

  const again = await deleteAccount(db, store, victim);
  assert.equal(again.mediaKeys, 0);
  console.log("ok  idempotent retry");

  await deleteAccount(db, store, bystander);
  await exec("DELETE FROM payment_events WHERE id LIKE 'pe-del-%'");
  await proxy.dispose();
  console.log("PASS account deletion");
};

run().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
