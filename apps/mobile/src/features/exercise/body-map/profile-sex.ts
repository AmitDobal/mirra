/** Stored profile sex (API + SQLite); the quiz's "prefer_not" maps to "unspecified". */
export type ProfileSex = "female" | "male" | "unspecified";

const SEXES: readonly ProfileSex[] = ["female", "male", "unspecified"];

/** Narrow an untyped profile field (SQLite text / GET /v1/me JSON) to a sex id. */
export const toProfileSex = (value: unknown): ProfileSex | null =>
  typeof value === "string" && (SEXES as readonly string[]).includes(value)
    ? (value as ProfileSex)
    : null;

/**
 * Sex for anatomy art (AMI-175). Server profile (GET /v1/me) wins: it is set at
 * onboarding on every device, while the SQLite row only exists on the device that
 * ran the quiz (sign-in on a new phone / reinstall had no row → male art for women).
 * Local row covers offline / before /me lands. A known sex beats "unspecified".
 */
export const pickProfileSex = (remote: unknown, local: unknown): ProfileSex | null => {
  const r = toProfileSex(remote);
  const l = toProfileSex(local);
  if (r && r !== "unspecified") return r;
  if (l && l !== "unspecified") return l;
  return r ?? l;
};
