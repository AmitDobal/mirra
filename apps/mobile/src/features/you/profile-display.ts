import type { MeAccount, MeEntitlement, MeUser } from "@/lib/api/me";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  apple: "Apple",
  credential: "Email",
  email: "Email",
};

const EXP_LABELS: Record<string, string> = {
  new: "New",
  months: "Some months",
  some_months: "Some months",
  y1_2: "1–2 years",
  one_two_years: "1–2 years",
  y3_plus: "3+ years",
  three_plus: "3+ years",
};

export const experienceLabel = (experience: string | undefined): string => {
  if (!experience) return "Member";
  return (
    EXP_LABELS[experience] ??
    experience.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
};

/** Human label for Better Auth `providerId`; unknown ids title-cased. */
export const providerLabel = (providerId: string): string => {
  const known = PROVIDER_LABELS[providerId.toLowerCase()];
  if (known) return known;
  return providerId.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
};

/** Deduped connected-account labels for settings rows. */
export const connectedAccountLabels = (accounts: readonly MeAccount[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of accounts) {
    const label = providerLabel(a.providerId);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
};

export const displayName = (user: MeUser | null, fallback: string): string => {
  const n = user?.name?.trim();
  if (n) return n;
  const e = user?.email?.trim();
  if (e) return e.split("@")[0] ?? fallback;
  return fallback;
};

export const displaySubtitle = (user: MeUser | null, fallback: string): string => {
  const e = user?.email?.trim();
  if (e) return e;
  return fallback;
};

/** Up to 2 initials from name/email; empty when nothing useful. */
export const initialsFrom = (user: MeUser | null): string => {
  const raw = user?.name?.trim() || user?.email?.trim() || "";
  if (!raw) return "";
  const parts = raw.includes("@")
    ? [raw.split("@")[0] ?? ""]
    : raw.split(/\s+/).filter(Boolean);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").filter(Boolean);
  return letters.slice(0, 2).join("");
};

/** PRO badge when entitlement is trial/active/grace. */
export const showProBadge = (ent: MeEntitlement | null | undefined): boolean => {
  if (!ent) return false;
  return ent.status === "trial" || ent.status === "active" || ent.status === "grace";
};
