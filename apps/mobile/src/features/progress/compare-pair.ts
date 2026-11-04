/**
 * S23 compare pair (AMI-177). Pure — unit-tested with `node --test`.
 * Current = newest progress photo. Baseline = onboarding mirror selfie when present,
 * else the oldest progress photo (never the second-newest).
 */
export type ComparePhoto = {
  readonly id: string;
  readonly label: string;
  readonly uri: string | null;
  /** Epoch ms; `null` = unknown (onboarding selfie). */
  readonly takenAt: number | null;
};

export type ComparePair = {
  readonly current: ComparePhoto | null;
  readonly baseline: ComparePhoto | null;
  /** Whole days between the two, `null` when either date is unknown. */
  readonly daysApart: number | null;
};

const DAY_MS = 86_400_000;

/** `photos` is newest first (progress-store order). */
export const pickComparePair = (
  photos: readonly ComparePhoto[],
  mirror: ComparePhoto | null,
): ComparePair => {
  const current = photos[0] ?? null;
  const oldest = photos.length >= 2 ? (photos[photos.length - 1] ?? null) : null;
  const baseline = mirror?.uri ? mirror : oldest;
  const daysApart =
    current?.takenAt != null && baseline?.takenAt != null
      ? Math.round(Math.abs(current.takenAt - baseline.takenAt) / DAY_MS)
      : null;
  return { current, baseline, daysApart };
};
