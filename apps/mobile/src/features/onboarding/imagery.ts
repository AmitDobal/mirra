import {
  s06Target,
  s11GeneratingWeek,
  s12WeekReveal,
  s13Paywall,
} from "../../../assets/stitch";

import { useOnboardingStore } from "./store";
import type { SexId } from "./types";

/** Resolved asset gender for people imagery after body-stats. */
export type ImageryGender = "female" | "male";

/**
 * `female` → female athletes; `male` OR `prefer_not` → male.
 * Null (pre-selection) falls back to male; welcome stays mixed and does not use this.
 */
export const imageryGenderForSex = (sex: SexId | null): ImageryGender =>
  sex === "female" ? "female" : "male";

export type OnboardingImagery = {
  gender: ImageryGender;
  targetAthlete: number;
  generating: {
    athleteSquatBw: number;
    sprinterKneelingBw: number;
    athleteBarbellBw: number;
  };
  weekRevealWorkouts: readonly [number, number, number];
  paywallCoach: number;
};

/** Pick gendered Stitch people assets for post-sex onboarding screens. */
export const getOnboardingImagery = (
  sex: SexId | null,
): OnboardingImagery => {
  const gender = imageryGenderForSex(sex);
  const s11 = s11GeneratingWeek[gender];
  const s12 = s12WeekReveal[gender];
  return {
    gender,
    targetAthlete: s06Target[gender].athleteTyingShoes,
    generating: {
      athleteSquatBw: s11.athleteSquatBw,
      sprinterKneelingBw: s11.sprinterKneelingBw,
      athleteBarbellBw: s11.athleteBarbellBw,
    },
    weekRevealWorkouts: [
      s12.dumbbellOverheadPress,
      s12.barbellBentOverRow,
      s12.barbellBackSquat,
    ],
    paywallCoach: s13Paywall[gender].coachCutout,
  };
};

/** Store-derived imagery for onboarding screens that show people. */
export const useOnboardingImagery = (): OnboardingImagery => {
  const sex = useOnboardingStore((s) => s.sex);
  return getOnboardingImagery(sex);
};
