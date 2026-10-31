export type MacroState = "under" | "hit" | "over";

export type MacroMeterView = {
  readonly state: MacroState;
  readonly pct: number;
  readonly left: number;
  readonly overBy: number;
  /** Remaining-first label: "30g left" | "On target" | "12g over". */
  readonly label: string;
};

const HIT_TOLERANCE = 0.05;

/** Mirrors the API `MacroMeter` thresholds: hit = within ±5% of target. */
export const macroMeter = (logged: number, target: number): MacroMeterView => {
  const safeTarget = Math.max(0, target);
  const delta = logged - safeTarget;
  const state: MacroState =
    safeTarget > 0 && delta > safeTarget * HIT_TOLERANCE
      ? "over"
      : safeTarget > 0 && Math.abs(delta) <= safeTarget * HIT_TOLERANCE
        ? "hit"
        : "under";
  const left = Math.max(0, Math.round(safeTarget - logged));
  const overBy = Math.max(0, Math.round(delta));
  const label =
    state === "over" ? `${overBy}g over` : state === "hit" ? "On target" : `${left}g left`;
  return {
    state,
    pct: safeTarget > 0 ? Math.min(100, Math.round((logged / safeTarget) * 100)) : 0,
    left,
    overBy,
    label,
  };
};
