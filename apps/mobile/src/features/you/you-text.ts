import { StyleSheet } from "react-native";

import { color, font } from "@/theme/tokens";

/**
 * S41 type sizes that sx cannot express (`text-[22px]`, `leading-*`, `tracking-*`, half steps).
 * Values are straight from `stitch_mirra_ai_personal_trainer/s41_profile_v2/code.html`.
 */
export const t = StyleSheet.create({
  name: { fontFamily: font.headlineSemi, fontSize: 22, lineHeight: 28, color: color.onSurface },
  initials: { fontFamily: font.headlineSemi, fontSize: 18, lineHeight: 24, color: color.onSurface },
  pro: { fontFamily: font.labelBold, fontSize: 9, lineHeight: 12, letterSpacing: 0.4, color: color.onPrimaryFixed },
  tileTitle: { fontFamily: font.headlineSemi, fontSize: 18, lineHeight: 24, color: color.onSurface },
  trainerName: { fontFamily: font.headlineSemi, fontSize: 14, lineHeight: 18, color: color.onSurface, textAlign: "center" },
  hint: { fontFamily: font.body, fontSize: 11, lineHeight: 16, color: color.onSurfaceVariant },
  status: { fontFamily: font.labelBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.9 },
  planLink: { fontFamily: font.label, fontSize: 12, lineHeight: 16, color: color.primaryFixed },
  weekOf: { fontFamily: font.label, fontSize: 12, lineHeight: 16, color: color.primaryFixed, marginTop: 2 },
  locChip: { fontFamily: font.label, fontSize: 12, lineHeight: 16 },
  signOut: { fontFamily: font.label, fontSize: 14, lineHeight: 20, color: color.error },
});

/** Half-step spacing sx drops (`mt-0.5`, `mb-2.5`, `mt-3.5`). */
export const gap = { half: 2, twoHalf: 10, threeHalf: 14 } as const;
