# Mirra — security practices

## Principles

1. **Least privilege** — mobile holds public keys only; all secrets on Worker
2. **Validate everything** — Zod at boundary; reject unknown fields
3. **Own-data only** — every query scoped by `user_id`
4. **Defense in depth** — auth + authz + rate limit + audit
5. **Privacy by design** — body photos are sensitive; short-TTL URLs; delete path

## Transport & sessions

- TLS everywhere (CF)
- Native: Better Auth bearer / secure cookie; tokens in **SecureStore**, never AsyncStorage
- Rotate refresh; revoke on password/OAuth unlink / ban
- `x-request-id` on all responses for support without logging bodies

## AuthN / AuthZ

- Apple + Google + email via Better Auth
- Server checks entitlement for Pro mutations
- Banned users → 403 hard stop
- Admin: none in v1 (no god-mode routes)

## Uploads (R2)

- Client never gets permanent write credentials
- `upload-url` returns **PUT** presign ≤5–15 min, content-type + max bytes enforced
- Confirm verifies object exists + size/type before attaching to `progress_photos` / meals
- Public read: either private + signed GET, or CF access rules — prefer signed GET
- Strip EXIF on confirm when feasible (Worker or client manipulator before upload)

## Payments

- **RevenueCat** is source of truth for mobile entitlement
- Webhook: verify Authorization / signing secret; idempotent `event_id`
- Never trust client `isPro` boolean alone for server mutations
- Dodo: web-only later; never as App Store IAP bypass

## AI / plan generation

- Run only on server; API keys in Worker secrets
- Prompt injection: structured JSON schema out; no tool that deletes user data
- Cap tokens + rate limit per user/day
- Do not send full photo binaries to LLM in v1 (metadata / answers only) unless product explicitly adds vision later with consent

## Abuse & rate limits

| Route class | Limit (starting point) |
| --- | --- |
| Auth | strict CF + app limits |
| Plan generate / rebuild | low (e.g. 5/day) |
| Upload URL | medium |
| Generic authenticated | standard |

Use D1/KV `rate_limits` table; return `429` + `Retry-After`.

## Data retention & delete

- `DELETE /v1/me` → enqueue wipe: D1 user cascade + R2 prefix delete
- Keep `payment_events` anonymized if legally needed
- Export: optional later (GDPR) — design schema so export is possible

## Logging

- No passwords, tokens, full card data (N/A), or raw photo bytes in logs
- Redact email in analytics; PostHog: identify with opaque id
- Security incidents: rotate secrets via Wrangler; document in runbook later

## Mobile hardening

- Jailbreak detection: not required v1
- Certificate pinning: defer
- Screen capture of progress photos: OS default; warn in copy
- Deep links: validate paths; no open redirects

## Dependency hygiene

- Lockfiles committed; Dependabot/renovate later
- No `eval` of model output as code
- Pin Wrangler / Expo majors intentionally

## Threat notes (fitness app)

- Impersonation → strong OAuth + session
- Entitlement fraud → RC webhook + server check
- Non-consensual photo leak → private R2 + authz
- Medical overclaim → product copy ban (not only eng)
