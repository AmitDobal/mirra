export {
  saveOnboarding,
  getProfile,
  setLocalTrainerPersona,
  setLocalTrainingLocation,
} from "./profile";
export { savePlan, getCurrentPlan, getToday } from "./plans";
export type { SavePlanInput } from "./plans";
export { deleteLocalMeal, logMeal, getFuelToday, updateLocalMeal } from "./meals";
export type { LocalMealPatch, LocalMealRef, LogMealInput } from "./meals";
export { submitCheckIn, listCheckIns } from "./check-ins";
export type { SubmitCheckInInput } from "./check-ins";
export {
  startSession,
  logSet,
  completeSession,
  getLastSetForExercise,
} from "./sessions";
export type {
  LastSet,
  StartSessionInput,
  LogSetInput,
  CompleteSessionInput,
  LocalSession,
  LocalSetLog,
} from "./sessions";
export {
  saveProgressPhoto,
  listProgressPhotos,
  upsertProgressPhotoMirror,
  getProgressPhotoById,
} from "./progress-photos";
export type { SaveProgressPhotoInput } from "./progress-photos";
export { getCached, setCached, clearCached } from "./ai-cache";
export type { CachedEntry } from "./ai-cache";
export {
  addWeightLog,
  listWeightLogs,
  removeWeightLog,
  replaceWeightLogs,
  setProfileWeight,
} from "./weight-logs";
export type { AddWeightLogInput } from "./weight-logs";
