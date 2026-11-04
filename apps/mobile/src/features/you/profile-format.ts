/**
 * S41 You / Profile v2 view model. Pure: profile + prefs in, display strings out (unit-tested).
 * Stored values are always metric (cm / kg); `units` only changes what the user sees.
 */
import { profileCopy as c } from "../../content/profile";

export type Units = "metric" | "imperial";

/** Server `OnboardingProfile` + `OnboardingPreferences`, loosely typed (me-store or local SQLite). */
export type ProfileSource = {
  readonly sex?: string | null;
  readonly ageYears?: number | null;
  readonly heightCm?: number | null;
  readonly weightKg?: number | null;
  readonly goalWeightKg?: number | null;
  readonly pace?: string | null;
};

export type PrefsSource = {
  readonly primaryGoal?: string;
  readonly experience?: string;
  readonly equipment?: readonly string[];
  readonly trainDays?: readonly number[];
  readonly sessionMinutes?: number;
  readonly dietTags?: readonly string[];
  readonly foodsAvoid?: string | null;
  readonly cuisineStyles?: readonly string[];
  readonly units?: string;
  readonly physiqueTarget?: string | null;
  readonly lifestyleNotes?: string | null;
  readonly mealsPerDay?: number | null;
};

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const toUnits = (u: string | null | undefined): Units => (u === "imperial" ? "imperial" : "metric");

export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;

/** cm → whole feet + inches (inches rounded; 11.6 rolls to the next foot). */
export const cmToFtIn = (cm: number): { ft: number; inch: number } => {
  const total = Math.round(cm / CM_PER_IN);
  return { ft: Math.floor(total / 12), inch: total % 12 };
};
export const ftInToCm = (ft: number, inch: number): number =>
  Math.round((ft * 12 + inch) * CM_PER_IN * 10) / 10;

export const formatHeight = (cm: number | null | undefined, units: Units): string => {
  if (cm == null || cm <= 0) return c.notSet;
  if (units === "metric") return `${Math.round(cm)} cm`;
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};

export const formatWeight = (kg: number | null | undefined, units: Units): string => {
  if (kg == null || kg <= 0) return c.notSet;
  return units === "metric" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kgToLb(kg))} lb`;
};

const label = (map: Readonly<Record<string, string>>, id: string | null | undefined, empty = c.notSet) =>
  id ? (map[id] ?? id.replace(/_/g, " ").replace(/^\w/, (ch) => ch.toUpperCase())) : empty;

const joinLabels = (map: Readonly<Record<string, string>>, ids: readonly string[] | undefined, empty: string) =>
  ids && ids.length ? ids.map((id) => label(map, id)).join(" · ") : empty;

export const sexLabel = (sex: string | null | undefined) => label(c.sex, sex);
export const goalLabel = (id: string | null | undefined) => label(c.goal, id);
export const physiqueLabel = (id: string | null | undefined) => label(c.physique, id);
export const experienceText = (id: string | null | undefined) =>
  label({ ...c.legacyExperience, ...c.experience }, id);
export const paceLabel = (id: string | null | undefined) => label(c.pace, id);

/** `[1,3,5,6]` → "Mon · Wed · Fri · Sat" (Monday = 1). */
export const trainDaysLabel = (days: readonly number[] | undefined): string => {
  const sorted = [...new Set(days ?? [])].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  return sorted.length ? sorted.map((d) => c.weekdayShort[d - 1]).join(" · ") : c.notSet;
};

/** Row value + section for every S41 field row (in screen order). */
export type ProfileRowId =
  | "sex" | "ageYears" | "heightCm" | "weightKg" | "goalWeightKg" | "pace" | "units"
  | "primaryGoal" | "physiqueTarget" | "experience" | "trainDays" | "sessionMinutes" | "equipment"
  | "lifestyleNotes" | "dietTags" | "cuisineStyles" | "mealsPerDay" | "foodsAvoid";

export type ProfileRow = { readonly id: ProfileRowId; readonly title: string; readonly value: string };

export type ProfileView = {
  readonly units: Units;
  /** Personal details sheet rows (kept off the main scroll per PM). */
  readonly body: readonly ProfileRow[];
  readonly training: readonly ProfileRow[];
  readonly aboutDays: string;
  readonly nutrition: readonly ProfileRow[];
};

export const buildProfileView = (p: ProfileSource | null, q: PrefsSource | null): ProfileView => {
  const units = toUnits(q?.units);
  const row = (id: ProfileRowId, value: string): ProfileRow => ({ id, title: c.rows[id], value });
  return {
    units,
    body: [
      row("sex", sexLabel(p?.sex)),
      row("ageYears", p?.ageYears ? String(p.ageYears) : c.notSet),
      row("heightCm", formatHeight(p?.heightCm, units)),
      row("weightKg", formatWeight(p?.weightKg, units)),
      row("goalWeightKg", formatWeight(p?.goalWeightKg, units)),
      row("pace", paceLabel(p?.pace)),
      row("units", c.units[units]),
    ],
    training: [
      row("primaryGoal", goalLabel(q?.primaryGoal)),
      row("physiqueTarget", physiqueLabel(q?.physiqueTarget)),
      row("experience", experienceText(q?.experience)),
      row("trainDays", trainDaysLabel(q?.trainDays)),
      row("sessionMinutes", q?.sessionMinutes ? `${q.sessionMinutes} min` : c.notSet),
      row("equipment", joinLabels(c.equipment, q?.equipment, c.none)),
    ],
    aboutDays: q?.lifestyleNotes?.trim() || c.aboutEmpty,
    nutrition: [
      row("dietTags", joinLabels(c.diet, q?.dietTags, c.notSet)),
      row("cuisineStyles", joinLabels(c.cuisine, q?.cuisineStyles, c.notSet)),
      row("mealsPerDay", String(q?.mealsPerDay ?? 4)),
      row("foodsAvoid", q?.foodsAvoid?.trim() || c.none),
    ],
  };
};

type ServerMe = { readonly profile?: unknown; readonly preferences?: unknown } | null | undefined;
type LocalMe = { readonly preferences?: unknown } | null | undefined;

/**
 * Which profile to render (QA AMI-182): once `/v1/me` answered with any onboarding data, the server
 * wins for BOTH profile and prefs; never mix in on-device quiz values. Local SQLite only paints
 * before the server answers (offline / first frame).
 */
export const pickProfileSources = (me: ServerMe, local: LocalMe): { profile: ProfileSource | null; prefs: PrefsSource | null } => {
  if (me && (me.profile || me.preferences)) {
    return { profile: (me.profile ?? null) as ProfileSource | null, prefs: (me.preferences ?? null) as PrefsSource | null };
  }
  return { profile: (local ?? null) as ProfileSource | null, prefs: (local?.preferences ?? null) as PrefsSource | null };
};

/** Fields whose change should offer a plan rebuild (never auto-run). */
const PLAN_FIELDS: readonly string[] = [
  "trainDays", "sessionMinutes", "equipment", "primaryGoal", "experience", "mealsPerDay", "dietTags",
];

/** True when `patch` changes at least one plan-affecting field vs `before`. */
export const affectsPlan = (patch: Readonly<Record<string, unknown>>, before: PrefsSource | null): boolean =>
  Object.entries(patch).some(([k, v]) => {
    if (!PLAN_FIELDS.includes(k)) return false;
    const prev = (before as Record<string, unknown> | null)?.[k];
    return JSON.stringify(Array.isArray(v) ? [...v].sort() : v) !==
      JSON.stringify(Array.isArray(prev) ? [...prev].sort() : prev ?? null);
  });
