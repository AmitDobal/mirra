import {
  Bell,
  Dumbbell,
  Flame,
  Utensils,
  Award,
  Bot,
  type LucideIcon,
} from "lucide-react-native";

import type { NotificationKind } from "@/lib/api";
import { color } from "@/theme/tokens";

export type AlertFilter = "all" | "unread" | "workouts" | "coach" | "nutrition";

export const FILTERS: readonly { readonly id: AlertFilter; readonly label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "workouts", label: "Workouts" },
  { id: "coach", label: "Coach" },
  { id: "nutrition", label: "Nutrition" },
];

const FILTER_KINDS: Record<Exclude<AlertFilter, "all" | "unread">, readonly NotificationKind[]> = {
  workouts: ["workout", "streak_at_risk", "badge_unlock"],
  coach: ["coach"],
  nutrition: ["nutrition"],
};

export const matchesFilter = (
  filter: AlertFilter,
  n: { readonly kind: NotificationKind; readonly readAt: number | null },
): boolean => {
  if (filter === "all") return true;
  if (filter === "unread") return n.readAt == null;
  return FILTER_KINDS[filter].includes(n.kind);
};

type KindMeta = {
  readonly Icon: LucideIcon;
  /** sx classes for the unread bar, icon tile, icon + time colors. */
  readonly bar: string;
  readonly tile: string;
  readonly time: string;
  readonly cta: string;
  readonly iconColor: string;
};

export const KIND_META: Record<NotificationKind, KindMeta> = {
  streak_at_risk: {
    Icon: Flame,
    bar: "bg-on-tertiary-container",
    tile: "bg-error-container/30 border-error-container",
    time: "text-error",
    cta: "border-primary-fixed text-primary-fixed",
    iconColor: color.error,
  },
  badge_unlock: {
    Icon: Award,
    bar: "bg-primary-fixed",
    tile: "bg-primary-fixed/10 border-primary-fixed/40",
    time: "text-primary-fixed",
    cta: "border-primary-fixed text-primary-fixed",
    iconColor: color.primaryFixed,
  },
  coach: {
    Icon: Bot,
    bar: "bg-secondary-fixed",
    tile: "bg-secondary-container/40 border-secondary-fixed/50",
    time: "text-secondary-fixed",
    cta: "border-secondary-fixed text-secondary-fixed",
    iconColor: color.secondaryFixed,
  },
  workout: {
    Icon: Dumbbell,
    bar: "bg-primary-fixed",
    tile: "bg-primary-fixed/10 border-primary-fixed/40",
    time: "text-primary-fixed",
    cta: "border-primary-fixed text-primary-fixed",
    iconColor: color.primaryFixed,
  },
  nutrition: {
    Icon: Utensils,
    bar: "bg-secondary-fixed",
    tile: "bg-secondary-container/40 border-secondary-fixed/50",
    time: "text-secondary-fixed",
    cta: "border-secondary-fixed text-secondary-fixed",
    iconColor: color.secondaryFixed,
  },
  system: {
    Icon: Bell,
    bar: "bg-outline",
    tile: "bg-surface-container-high border-surface-container-highest",
    time: "text-on-surface-variant",
    cta: "border-outline text-on-surface-variant",
    iconColor: color.onSurfaceVariant,
  },
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** `18m ago`, `2h ago`, `Yesterday`, `3d ago`, then a short date. */
export const timeAgo = (at: number, now: number = Date.now()): string => {
  const diff = Math.max(0, now - at);
  if (diff < MIN) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 2 * DAY) return "Yesterday";
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const unreadLabel = (count: number): string => (count > 99 ? "99+" : String(count));
