import { router } from "expo-router";

export const EXERCISE_DETAIL_ROUTE = "/(tabs)/exercise-detail";

/** Open S26 for a lift in today's session (plan id) or a library lift (catalog id). */
export const openExerciseDetail = (target: {
  readonly exerciseId?: string;
  readonly catalogId?: string;
}): void => {
  router.push({ pathname: EXERCISE_DETAIL_ROUTE, params: { ...target } });
};
