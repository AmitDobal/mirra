/** Cloudflare bindings for Mirra API. Regenerate via `npm run cf-typegen` when wrangler changes. */
export type MirraEnv = {
  DB: D1Database;
  MEDIA: R2Bucket;
  APP_NAME: string;
  APP_VERSION: string;
  /**
   * DEV ONLY — set `"true"` in wrangler vars for local/smoke.
   * When enabled, `x-mirra-user-id` (alias `x-user-id`) bypasses session auth
   * and upserts an ephemeral users row. Never enable in production.
   */
  ALLOW_DEV_USER_HEADER?: string;
  /** Optional AI / auth secrets — set via wrangler secrets later. */
  BETTER_AUTH_SECRET?: string;
  OPENAI_API_KEY?: string;
};
