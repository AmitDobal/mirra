import { Award, Target, Zap } from "lucide-react-native";

import { FlameIcon } from "@/features/today/FlameIcon";

import type { RankIcon } from "./rank-meta";

type Props = {
  readonly icon: RankIcon;
  readonly size: number;
  /** Stroke color for line glyphs; Ember always uses the crimson S29 flame. */
  readonly tint: string;
  /** Dims the Ember flame for locked rows. */
  readonly dim?: boolean;
};

/** Kinetic tier glyph: Spark/Forge bolt, Ember flame, Volt target, Apex award (S33). */
export const RankGlyph = ({ icon, size, tint, dim = false }: Props) => {
  if (icon === "flame") return <FlameIcon size={size + 4} lit={!dim} />;
  if (icon === "volt") return <Target size={size} color={tint} />;
  if (icon === "apex") return <Award size={size} color={tint} />;
  return <Zap size={size} color={tint} />;
};
