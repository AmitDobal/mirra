import type { ProgressPhoto } from "./progress-store";

const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Distinct check-in days in the loaded page (honest, not fabricated). */
export const streakishDays = (photos: readonly ProgressPhoto[]): number => {
  const keys = [...new Set(photos.map((p) => dayKey(p.takenAt)))].sort().reverse();
  if (keys.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < keys.length; i += 1) {
    const prev = new Date(`${keys[i - 1]}T12:00:00Z`).getTime();
    const cur = new Date(`${keys[i]}T12:00:00Z`).getTime();
    if (Math.round((prev - cur) / 86_400_000) === 1) streak += 1;
    else break;
  }
  return streak;
};
