import type { CurrentPlan, PlanDay, PlanWorkout } from "./types";

type NestedPlanPayload = {
  readonly plan?: {
    readonly id?: string;
    readonly version?: number;
    readonly status?: string;
    readonly weekStart?: string;
    readonly summary?: Record<string, unknown>;
  };
  readonly days?: readonly (PlanDay & { readonly workoutId?: string | null })[];
  readonly workouts?: readonly PlanWorkout[];
  readonly id?: string;
  readonly version?: number;
  readonly status?: string;
  readonly weekStart?: string;
  readonly summary?: Record<string, unknown>;
};

/**
 * API returns `{ plan, days, workouts }` with `workoutId` on days.
 * App stores expect a flat `CurrentPlan` with workouts embedded on days.
 */
export const normalizeCurrentPlan = (raw: unknown): CurrentPlan | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as NestedPlanPayload;

  if (r.plan && typeof r.plan === "object") {
    const byId = new Map(
      (r.workouts ?? []).map((w) => [w.id, w] as const),
    );
    const days: PlanDay[] = (r.days ?? []).map((d) => {
      const workoutId =
        d.workout?.id ??
        (d as { workoutId?: string | null }).workoutId ??
        null;
      const workout =
        d.workout ?? (workoutId ? (byId.get(workoutId) ?? null) : null);
      return {
        id: d.id,
        dayIndex: d.dayIndex,
        date: d.date,
        kind: d.kind,
        label: d.label ?? null,
        workout: workout ?? null,
      };
    });
    if (!r.plan.id || days.length === 0) return null;
    return {
      id: String(r.plan.id),
      version: Number(r.plan.version ?? 1),
      status: String(r.plan.status ?? "ready"),
      weekStart: String(r.plan.weekStart ?? ""),
      summary: r.plan.summary,
      days,
    };
  }

  if (typeof r.id === "string" && Array.isArray(r.days)) {
    return {
      id: r.id,
      version: Number(r.version ?? 1),
      status: String(r.status ?? "ready"),
      weekStart: String(r.weekStart ?? ""),
      summary: r.summary,
      days: r.days,
    };
  }

  return null;
};
