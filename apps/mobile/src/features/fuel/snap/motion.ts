import type { MotiTransition } from "moti";

type TimingOpts = {
  readonly duration?: number;
  readonly delay?: number;
  readonly loop?: boolean;
  readonly repeatReverse?: boolean;
  readonly easing?: (t: number) => number;
};

/** Typed Moti transition builders (inline object literals fail Moti's index-signature typing). */
export const timing = (o: TimingOpts = {}): MotiTransition =>
  ({ type: "timing", ...o }) as MotiTransition;

export const spring = (o: { damping?: number; delay?: number } = {}): MotiTransition =>
  ({ type: "spring", ...o }) as MotiTransition;
