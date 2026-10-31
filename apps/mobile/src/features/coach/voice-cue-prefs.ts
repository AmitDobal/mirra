import * as SecureStore from "expo-secure-store";

import { errorMessage, logger } from "@/lib/logger";

const SPEAK_KEY = "mirra.speak_coach_cues";
const PLAYED_PREFIX = "voice_cue_played_";

/** Local calendar date (YYYY-MM-DD), not UTC: "once a day" follows the user's day. */
export const localDateKey = (now: Date = new Date()): string => {
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
};

const read = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    logger.warn("voice_cue.prefs.read_failed", { key, message: errorMessage(err) });
    return null;
  }
};

const write = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    logger.warn("voice_cue.prefs.write_failed", { key, message: errorMessage(err) });
  }
};

/** Default ON until the user turns it off. */
export const getSpeakCuesEnabled = async (): Promise<boolean> =>
  (await read(SPEAK_KEY)) !== "off";

export const setSpeakCuesEnabled = (enabled: boolean): Promise<void> =>
  write(SPEAK_KEY, enabled ? "on" : "off");

export const hasPlayedCueOn = async (date: string): Promise<boolean> =>
  (await read(`${PLAYED_PREFIX}${date}`)) === "1";

export const markCuePlayed = (date: string): Promise<void> => write(`${PLAYED_PREFIX}${date}`, "1");

export const clearCuePlayed = async (date: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(`${PLAYED_PREFIX}${date}`);
  } catch (err) {
    logger.warn("voice_cue.prefs.clear_failed", { message: errorMessage(err) });
  }
};
