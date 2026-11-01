import { MirraApiError } from "@/lib/api";

export type SnapFailKind = "permission" | "credits" | "network" | "unreadable" | "generic";

export type SnapFailure = {
  readonly kind: SnapFailKind;
  readonly title: string;
  readonly body: string;
};

export const permissionFailure = (): SnapFailure => ({
  kind: "permission",
  title: "Camera access is off",
  body: "Allow camera or photos in Settings to snap a meal, or describe it instead.",
});

/** RN / Expo fetch failures arrive as plain Errors with these messages. */
const NETWORK_RE = /network|fetch failed|could not connect|offline|timed out|internet/i;

/** Map any estimate/upload error to user copy. No raw server text. */
export const toSnapFailure = (err: unknown): SnapFailure => {
  if (err instanceof MirraApiError) {
    if (err.status === 402 || err.status === 429) {
      return {
        kind: "credits",
        title: "AI estimates are used up",
        body: "You've reached this month's meal scan limit. Log the meal manually and it still counts.",
      };
    }
    if (err.status === 400 || err.status === 413) {
      return {
        kind: "unreadable",
        title: "Couldn't read that photo",
        body: "Try a brighter, closer shot of the plate, or describe the meal instead.",
      };
    }
  }
  if (err instanceof TypeError || (err instanceof Error && NETWORK_RE.test(err.message))) {
    return {
      kind: "network",
      title: "No connection",
      body: "Mirra couldn't reach the server. Check your signal and try again.",
    };
  }
  return {
    kind: "generic",
    title: "Analysis didn't finish",
    body: "Something went wrong reading this meal. Try again, describe it, or log it manually.",
  };
};
