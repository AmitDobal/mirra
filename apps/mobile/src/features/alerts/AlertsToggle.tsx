import { useEffect } from "react";

import { ToggleRow } from "@/features/you/you-settings";

import { useAlertsStore } from "./alerts-store";

/** You → Coaching: in-app alerts master switch (same pref as the soft ask). */
export const AlertsToggle = () => {
  const prefs = useAlertsStore((s) => s.prefs);
  const hydrate = useAlertsStore((s) => s.hydrate);
  const updatePrefs = useAlertsStore((s) => s.updatePrefs);

  useEffect(() => {
    if (!prefs) void hydrate();
  }, [prefs, hydrate]);

  return (
    <ToggleRow
      title="In-app alerts"
      detail="Streak and session nudges in your Alerts inbox"
      value={prefs?.inAppEnabled === true}
      disabled={!prefs}
      onChange={(v) => void updatePrefs({ inAppEnabled: v })}
    />
  );
};
