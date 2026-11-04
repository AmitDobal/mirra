import { Platform } from "react-native";

const android = Platform.OS === "android";

/** Store-account wording: Apple ID on iOS, Google Play on Android (AMI-177). */
const account = android ? "Google Play account" : "Apple ID";
const manageIn = android ? "Google Play subscriptions" : "Apple ID settings";

export const storeCopy = {
  legal: `Plan auto-renews after 7-day trial. Cancel anytime in ${manageIn} at least 24 hours before renewal.`,
  restoreNoneBody: `We couldn't find an active Mirra Pro plan on this ${account}. Start the free trial or try a different account.`,
  /** You > Connected health row (AMI-183): Health Connect on Android. */
  healthRow: android ? "Health Connect" : "Apple Health / Watch",
} as const;
