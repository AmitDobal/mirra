import { router } from "expo-router";

import { openProUpsell } from "@/features/you/AiLimitSheet";
import { isProNow } from "@/stores/pro-access";

/**
 * Rebuild entry (AMI-183): free users get the Pro upsell up front instead of a ~14 s AI
 * preview that the API would refuse to apply (403).
 */
export const openRebuild = (href: "/rebuild" | "/(tabs)/rebuild"): void => {
  if (!isProNow()) {
    openProUpsell();
    return;
  }
  router.push(href);
};
