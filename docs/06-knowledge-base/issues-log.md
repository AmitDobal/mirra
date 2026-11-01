# Issues log

## 2026-11-01 — Google OAuth invalid_request + kalshi branding (Expo Go)

**Symptom:** Continue with Google → Error 400 invalid_request / Access blocked; consent showed kalshi.
**Cause:** Authorize used iOS client for `host.exp.Exponent`; GCP branding App name was still kalshi.
**Fix:** Expo Go path = Web client + auth.expo.io proxy (`GoogleSignInButton`); branding → Mirra; EAS without IOS client id.
**Prevent:** Do not use Expo Go iOS OAuth client; document in `mirra-google-oauth.md`.
