import { apiFetch } from "./client";

export type BadgeDefinition = {
  readonly id: string;
  readonly ladder: "kinetic_rank" | "streak_milestone";
  readonly tier: number;
  readonly title: string;
  readonly thresholdDays: number;
  readonly stitchAssetKey: string | null;
};

export type UserBadge = {
  readonly badgeId: string;
  readonly unlockedAt: number;
};

export type BadgesResponse = {
  readonly definitions: readonly BadgeDefinition[];
  readonly unlocked: readonly UserBadge[];
  readonly bestStreak: number;
  readonly currentRankId: string | null;
  readonly nextRankId: string | null;
};

export const getBadges = () => apiFetch<BadgesResponse>("/v1/badges", { quiet: true });
