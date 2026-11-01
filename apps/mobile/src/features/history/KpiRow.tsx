import { CheckCircle2, Timer, TrendingDown, TrendingUp } from "lucide-react-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { sx } from "@/theme/sx";
import { color } from "@/theme/tokens";
import { CapsLabel } from "@/ui/CapsLabel";

import { fmtKcal, fmtMinutes, NA, type HistoryKpis } from "./history-model";

type TileProps = {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly footer: ReactNode;
};

const Tile = ({ label, value, unit, footer }: TileProps) => (
  <View style={sx("flex-1 rounded-lg bg-surface-container-low p-space-sm")}>
    <CapsLabel>{label}</CapsLabel>
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      style={sx("mt-1 font-display text-headline-md text-on-surface")}
    >
      {value}
    </Text>
    <Text style={sx("font-body text-body-sm text-on-surface-variant")}>{unit}</Text>
    <View style={sx("mt-space-xs flex-row items-center gap-1")}>{footer}</View>
  </View>
);

const FooterText = ({ children, tone }: { children: string; tone?: "lime" | "lavender" | "muted" }) => {
  const tint =
    tone === "lime" ? color.primaryFixed : tone === "lavender" ? color.secondary : color.onSurfaceVariant;
  return (
    <Text numberOfLines={1} style={[sx("font-label text-label-caps"), { color: tint }]}>
      {children}
    </Text>
  );
};

const avgFooter = (kpis: HistoryKpis): ReactNode => {
  if (kpis.avgDaily === null || kpis.target === null) return <FooterText>{NA}</FooterText>;
  const delta = kpis.avgDaily - kpis.target;
  const under = delta <= 0;
  const Icon = under ? TrendingDown : TrendingUp;
  const tint = under ? color.primaryFixed : color.secondary;
  return (
    <>
      <Icon size={12} color={tint} />
      <FooterText tone={under ? "lime" : "lavender"}>
        {`${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("en-US")} kcal`}
      </FooterText>
    </>
  );
};

const targetFooter = (kpis: HistoryKpis): ReactNode => {
  if (kpis.daysLogged === 0) return <FooterText>{NA}</FooterText>;
  const pct = Math.round((kpis.daysOnTarget / kpis.daysLogged) * 100);
  return (
    <>
      <CheckCircle2 size={12} color={color.secondary} />
      <FooterText tone="lavender">{`${pct}% goal`}</FooterText>
    </>
  );
};

type Props = { readonly kpis: HistoryKpis; readonly loading?: boolean };

/** AVG DAILY · ON TARGET · WORKOUTS summary tiles. */
export const KpiRow = ({ kpis, loading = false }: Props) => (
  <View style={[sx("mb-space-md flex-row gap-space-sm"), { opacity: loading ? 0.5 : 1 }]}>
    <Tile
      label="Avg daily"
      value={fmtKcal(kpis.avgDaily)}
      unit="kcal"
      footer={avgFooter(kpis)}
    />
    <Tile
      label="On target"
      value={kpis.daysLogged ? `${kpis.daysOnTarget} / ${kpis.daysLogged}` : NA}
      unit="days"
      footer={targetFooter(kpis)}
    />
    <Tile
      label="Workouts"
      value={kpis.workoutSessions > 0 ? String(kpis.workoutSessions) : NA}
      unit="sessions"
      footer={
        <>
          <Timer size={12} color={color.onSurfaceVariant} />
          <FooterText>{`${fmtMinutes(kpis.workoutMinutes)}${kpis.workoutMinutes > 0 ? " tot" : ""}`}</FooterText>
        </>
      }
    />
  </View>
);
