import { Pressable, Text, View } from "react-native";

import { creditsPool, type CreditsSnapshot } from "@/lib/api/credits";
import { sx } from "@/theme/sx";
import { CapsLabel } from "@/ui/CapsLabel";

type Props = {
  readonly credits: CreditsSnapshot | null;
  readonly onPress?: () => void;
};

const formatReset = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "next month";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** Clear English AI credit meter for You — no eng jargon. */
export const CreditsMeter = ({ credits, onPress }: Props) => {
  if (!credits) {
    const loading = (
      <View style={sx("p-space-md")}>
        <CapsLabel>AI credits</CapsLabel>
        <Text style={sx("mt-1 font-body text-body-sm text-on-surface-variant")}>
          Checking your balance…
        </Text>
      </View>
    );
    if (!onPress) return loading;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh AI credits"
        onPress={onPress}
      >
        {loading}
      </Pressable>
    );
  }
  const pool = creditsPool(credits);
  const used = Math.max(0, pool - credits.remaining);
  const pct = pool > 0 ? Math.min(1, credits.remaining / pool) : 0;
  const exhausted = credits.remaining <= 0;
  const low = credits.warnings.includes("low_credits");

  const body = exhausted
    ? `Out of AI credits · resets ${formatReset(credits.resetsAt)}`
    : `${credits.remaining} of ${pool} AI credits left · resets ${formatReset(credits.resetsAt)}`;

  const content = (
    <View style={sx("p-space-md")}>
      <CapsLabel>AI credits</CapsLabel>
      <Text style={sx("mt-1 font-body text-body-sm text-on-surface")}>{body}</Text>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ now: credits.remaining, min: 0, max: pool }}
        style={sx("mt-space-sm h-1.5 overflow-hidden rounded-full bg-surface-container-highest")}
      >
        <View
          style={[
            sx(
              `h-full rounded-full ${
                exhausted ? "bg-error" : low ? "bg-tertiary-fixed-dim" : "bg-primary-fixed"
              }`,
            ),
            { width: `${Math.round(pct * 100)}%` },
          ]}
        />
      </View>
      {used > 0 && !exhausted ? (
        <Text style={sx("mt-1 font-body text-[11px] text-on-surface-variant")}>
          {used} used this month
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={body} onPress={onPress}>
      {content}
    </Pressable>
  );
};
