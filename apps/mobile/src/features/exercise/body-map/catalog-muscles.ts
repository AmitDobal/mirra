/**
 * Catalog muscle labels ("Anterior Deltoids & Triceps Brachii") → our 18 muscle
 * ids. Labels split on "&" / "," and each segment takes the first matching rule,
 * so "Rear Deltoids" never also counts as front delts.
 */
import type { MuscleId, MuscleRole } from "@/features/anatomy";

type Rule = { readonly test: RegExp; readonly ids: readonly MuscleId[] };

const RULES: readonly Rule[] = [
  { test: /rear delt|posterior delt/, ids: ["rear_delts"] },
  { test: /lateral delt|side delt/, ids: ["side_delts"] },
  { test: /anterior delt|^\s*anterior\s*$|front delt/, ids: ["front_delts"] },
  { test: /deltoid|shoulder/, ids: ["front_delts", "side_delts"] },
  { test: /biceps femoris|hamstring/, ids: ["hamstrings"] },
  { test: /bicep/, ids: ["biceps"] },
  { test: /tricep/, ids: ["triceps"] },
  { test: /forearm|grip|brachioradialis/, ids: ["forearms"] },
  { test: /pector|chest/, ids: ["chest"] },
  { test: /trap/, ids: ["traps"] },
  { test: /latissimus|\blats?\b/, ids: ["lats"] },
  { test: /rhomboid|mid back|upper back/, ids: ["upper_back"] },
  { test: /erector|spinae|lower back/, ids: ["lower_back"] },
  { test: /\bback\b/, ids: ["lats", "upper_back"] },
  { test: /rectus|abdom|\babs\b/, ids: ["abs"] },
  { test: /oblique/, ids: ["obliques"] },
  { test: /core/, ids: ["abs", "obliques"] },
  { test: /glute/, ids: ["glutes"] },
  { test: /quad|vastus/, ids: ["quads"] },
  { test: /adductor/, ids: ["adductors"] },
  { test: /calf|calves|gastroc|soleus|tibialis/, ids: ["calves"] },
  { test: /\blegs?\b/, ids: ["quads", "glutes", "hamstrings"] },
];

/** Every muscle id named in one catalog label (order kept, no duplicates). */
export const musclesForLabel = (label: string): MuscleId[] => {
  const out: MuscleId[] = [];
  const segments = label
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/&|,|\band\b|\//);
  for (const seg of segments) {
    const rule = RULES.find((r) => r.test.test(seg));
    rule?.ids.forEach((id) => {
      if (!out.includes(id)) out.push(id);
    });
  }
  return out;
};

export type FocusMuscle = { readonly id: MuscleId; readonly role: MuscleRole };

/** Tag + first catalog row are primary; later rows are secondary unless already primary. */
export const focusMusclesFor = (
  muscles: readonly { readonly name: string; readonly pct: number }[],
  muscleTag: string,
): FocusMuscle[] => {
  const roles = new Map<MuscleId, MuscleRole>();
  const add = (ids: readonly MuscleId[], role: MuscleRole) =>
    ids.forEach((id) => {
      if (roles.get(id) !== "primary") roles.set(id, role);
    });
  add(musclesForLabel(muscleTag), "primary");
  muscles.forEach((m, i) => add(musclesForLabel(m.name), i === 0 ? "primary" : "secondary"));
  return [...roles].map(([id, role]) => ({ id, role }));
};
