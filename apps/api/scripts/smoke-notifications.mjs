#!/usr/bin/env node
/**
 * Smoke: in-app alerts inbox + prefs (AMI-155). No FCM.
 *   API_BASE=http://127.0.0.1:8787 node scripts/smoke-notifications.mjs
 * Needs ALLOW_DEV_USER_HEADER=true (seeds rows via /v1/notifications/dev/seed).
 */
const BASE = (process.env.API_BASE ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const RUN = Date.now();
let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  - ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const call = async (user, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(user ? { "x-mirra-user-id": user } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};
const seed = (u, n, extra = {}) =>
  call(u, "POST", "/v1/notifications/dev/seed", { kind: "coach", title: `T${n}`, body: `B${n}`, ...extra });

const main = async () => {
  console.log(`API ${BASE}`);
  const a = `smoke-notif-a-${RUN}`;
  const b = `smoke-notif-b-${RUN}`;

  check((await call(null, "GET", "/v1/notifications")).status === 401, "unauthenticated list = 401");

  let prefs = (await call(a, "GET", "/v1/notification-prefs")).json;
  check(prefs?.inAppEnabled === null && prefs.softAskDismissedAt === null, "new user: soft ask unanswered", JSON.stringify(prefs));
  check(prefs.streakReminders === true && prefs.workoutReminders === true, "reminder prefs default on");

  let list = (await call(a, "GET", "/v1/notifications")).json;
  check(list.items.length === 0 && list.unreadCount === 0 && list.nextCursor === null, "empty inbox");

  const dismissed = (await call(a, "PATCH", "/v1/notification-prefs", { softAskDismissed: true })).json;
  check(dismissed.inAppEnabled === null && dismissed.softAskDismissedAt > 0, "Not now = dismissed, still unanswered");

  check((await call(a, "PATCH", "/v1/notification-prefs", { pushToken: "x" })).status === 400, "unknown field (push token) rejected");
  check((await call(a, "PATCH", "/v1/notification-prefs", { quietStart: "25:00" })).status === 400, "bad HH:mm rejected");

  prefs = (await call(a, "PATCH", "/v1/notification-prefs", { inAppEnabled: true })).json;
  check(prefs.inAppEnabled === true, "Enable sets inAppEnabled");
  list = (await call(a, "GET", "/v1/notifications")).json;
  check(list.items.length === 1 && list.items[0].kind === "system" && list.unreadCount === 1, "first enable drops one welcome row");
  await call(a, "PATCH", "/v1/notification-prefs", { inAppEnabled: true });
  list = (await call(a, "GET", "/v1/notifications")).json;
  check(list.items.length === 1, "re-enable does not duplicate welcome");

  for (let i = 1; i <= 24; i += 1) await seed(a, i, i === 24 ? { kind: "streak_at_risk", payload: { route: "/workout/live", label: "Start Workout" } } : {});
  list = (await call(a, "GET", "/v1/notifications")).json;
  check(list.items.length === 20 && list.nextCursor, "page 1 = 20 rows + cursor", `unread=${list.unreadCount}`);
  check(list.items[0].title === "T24" && list.items[0].payload?.route === "/workout/live", "newest first, payload round-trips");
  const p2 = (await call(a, "GET", `/v1/notifications?cursor=${encodeURIComponent(list.nextCursor)}`)).json;
  const ids = new Set([...list.items, ...p2.items].map((n) => n.id));
  check(p2.items.length === 5 && p2.nextCursor === null && ids.size === 25, "page 2 = remaining 5, no dupes");
  check(list.unreadCount === 25, "unread count = 25");

  const first = list.items[0].id;
  check((await call(a, "POST", `/v1/notifications/${first}/read`)).status === 200, "mark one read");
  check((await call(a, "POST", `/v1/notifications/${first}/read`)).status === 200, "mark read is idempotent");
  list = (await call(a, "GET", "/v1/notifications?limit=5")).json;
  check(list.unreadCount === 24 && list.items[0].readAt > 0 && list.items.length === 5, "unread 24, readAt set, limit honoured");

  check((await call(b, "POST", `/v1/notifications/${first}/read`)).status === 404, "other user cannot read my row (404)");
  check((await call(b, "GET", "/v1/notifications")).json.items.length === 0, "other user inbox isolated");

  const all = (await call(a, "POST", "/v1/notifications/read-all")).json;
  check(all.updated === 24, "read-all updates 24", `updated=${all.updated}`);
  list = (await call(a, "GET", "/v1/notifications")).json;
  check(list.unreadCount === 0, "unread 0 after read-all");

  for (let i = 0; i < 3; i += 1) await seed(b, i);
  check((await call(b, "GET", "/v1/notifications")).json.unreadCount === 3, "unread count scoped to user");

  check((await call(a, "PATCH", "/v1/notification-prefs", { inAppEnabled: false, streakReminders: false })).json.streakReminders === false, "disable + streak toggle persist");
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
  process.exit(failures ? 1 : 0);
};
main();
