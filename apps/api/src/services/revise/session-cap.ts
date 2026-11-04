import type { ReviseItem } from "@mirra/contracts";

/** Shorter session (AMI-166 step 6): cap duration, drop tail moves proportionally. Pure. */

type Session = { durationMin: number; calorieEst: number | null };

export type SessionCap<R> = Session & { rows: R[]; item: ReviseItem | null; warning: string | null };

export const capSession = <R extends { name: string }>(rows: R[], s: Session, cap: number | undefined, minMoves: number): SessionCap<R> => {
  if (cap == null) return { ...s, rows, item: null, warning: null };
  if (cap >= s.durationMin) return { ...s, rows, item: null, warning: `Session is already ${s.durationMin} min` };
  const keep = Math.min(rows.length, Math.max(minMoves, Math.round((rows.length * cap) / s.durationMin)));
  const dropped = rows.slice(keep).map((r) => r.name);
  return {
    rows: rows.slice(0, keep),
    durationMin: cap,
    calorieEst: s.calorieEst != null ? Math.round((s.calorieEst * cap) / s.durationMin) : null,
    warning: null,
    item: {
      id: "session_minutes",
      kind: "session_minutes",
      before: s.durationMin,
      after: cap,
      droppedExercises: dropped,
      tags: [],
      reason: dropped.length > 0 ? `Drops ${dropped.join(", ")}` : null,
    },
  };
};
