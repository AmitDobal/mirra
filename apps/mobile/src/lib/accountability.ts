export type KcalStatus = {
  readonly over: boolean;
  readonly overBy: number;
  readonly left: number;
  /** "1,800/2,200" or "OVER by 440" */
  readonly chip: string;
  /** 0–100+ (can exceed 100 when over target). */
  readonly pct: number;
};

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export const kcalStatus = (logged: number, target: number): KcalStatus => {
  const over = target > 0 && logged > target;
  const overBy = over ? Math.round(logged - target) : 0;
  return {
    over,
    overBy,
    left: Math.max(0, Math.round(target - logged)),
    chip: over ? `OVER by ${fmt(overBy)}` : `${fmt(logged)}/${target ? fmt(target) : "—"} kcal`,
    pct: target > 0 ? Math.round((logged / target) * 100) : 0,
  };
};

export const proteinChip = (logged: number, target: number | null) =>
  target ? `${Math.round(logged)}/${Math.round(target)}g protein` : `${Math.round(logged)}g protein`;

/** Over-target nudge for the Fuel snackbar. */
export const overKcalTip = (overBy: number) =>
  `OVER by ${fmt(overBy)} kcal. Next meal: protein and veg only, then walk 20 min.`;
