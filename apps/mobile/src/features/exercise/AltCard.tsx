import { ArrowRight, Zap } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { color } from "@/theme/tokens";

import { thumbSource, type CatalogEntry } from "./catalog";
import { TagChip } from "./ExercisePills";
import { styles } from "./SwapAddSheet.styles";

type CardProps = {
  readonly entry: CatalogEntry;
  readonly best: boolean;
  readonly sets: number;
  readonly owned: boolean;
  /** `swap` explains the replacement; `add` shows the coach cue. */
  readonly intent: "swap" | "add";
  readonly onSelect: () => void;
};

export const AltCard = ({ entry, best, sets, owned, intent, onSelect }: CardProps) => (
  <View style={[styles.card, best ? styles.cardBest : null]}>
    {best ? (
      <View style={styles.bestBadge}>
        <Zap size={10} color={color.onPrimaryFixed} fill={color.onPrimaryFixed} />
        <Text style={styles.bestText}>BEST MATCH</Text>
      </View>
    ) : null}
    <View style={styles.cardTop}>
      <Image source={thumbSource(entry.thumb)} style={styles.thumb} resizeMode="cover" />
      <View style={styles.flex1}>
        <Text style={styles.cardName} numberOfLines={2}>
          {entry.name}
        </Text>
        <View style={styles.cardMeta}>
          <TagChip label={entry.equipment} tone="lavender" />
          <Text style={styles.cardSets}>
            {sets} × {entry.reps} reps
          </Text>
        </View>
      </View>
    </View>
    <View style={styles.why}>
      <Text style={styles.whyText}>
        <Text style={styles.whyLead}>{intent === "swap" ? "Why this swap: " : "Coach cue: "}</Text>
        {intent === "swap" ? entry.why : entry.cue}
        {owned ? "" : " You may need to find this equipment."}
      </Text>
    </View>
    <View style={styles.cardFoot}>
      <Text style={styles.footNote} numberOfLines={1}>
        {entry.muscle} · {entry.kind}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${entry.name}`}
        onPress={onSelect}
        style={styles.select}
      >
        <Text style={styles.selectText}>Select</Text>
        <ArrowRight size={14} color={color.onPrimaryFixed} strokeWidth={2.5} />
      </Pressable>
    </View>
  </View>
);

