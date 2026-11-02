/** Anatomical region ids for front-view kinetic map overlays. */
export type AnatomyRegionId =
  | "chest"
  | "shoulders"
  | "arms"
  | "core"
  | "back"
  | "glutes"
  | "quads"
  | "hams"
  | "calves";

export type RegionIntensity = "primary" | "secondary";

const KEYWORDS: readonly { readonly id: AnatomyRegionId; readonly tokens: readonly string[] }[] = [
  { id: "chest", tokens: ["pectoral", "chest"] },
  { id: "shoulders", tokens: ["deltoid", "shoulder"] },
  { id: "arms", tokens: ["triceps", "biceps", "brachii", "forearm"] },
  { id: "core", tokens: ["core", "abdom", "oblique", "rectus", "serratus", "erector"] },
  { id: "back", tokens: ["lat", "rhomboid", "trapez", "back", "spinae"] },
  { id: "glutes", tokens: ["glute"] },
  { id: "quads", tokens: ["quad", "vastus", "femoris"] },
  { id: "hams", tokens: ["hamstring", "biceps femoris", "semitend"] },
  { id: "calves", tokens: ["calf", "gastroc", "soleus", "tibialis"] },
];

const TAG_TO_REGION: Record<string, AnatomyRegionId> = {
  chest: "chest",
  "upper chest": "chest",
  back: "back",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  glutes: "glutes",
  quads: "quads",
  legs: "quads",
  hamstrings: "hams",
  calves: "calves",
};

const matchRegion = (label: string): AnatomyRegionId | null => {
  const lower = label.toLowerCase();
  for (const row of KEYWORDS) {
    if (row.tokens.some((t) => lower.includes(t))) return row.id;
  }
  return null;
};

/** Map catalog muscle rows + muscle tag → highlighted regions. */
export const regionsForMuscles = (
  muscles: readonly { readonly name: string; readonly pct: number }[],
  muscleTag: string,
): Partial<Record<AnatomyRegionId, RegionIntensity>> => {
  const out: Partial<Record<AnatomyRegionId, RegionIntensity>> = {};
  const tagRegion = TAG_TO_REGION[muscleTag.toLowerCase()];
  if (tagRegion) out[tagRegion] = "primary";

  muscles.forEach((m, i) => {
    const id = matchRegion(m.name);
    if (!id) return;
    const level: RegionIntensity = i === 0 ? "primary" : "secondary";
    if (!out[id] || (out[id] === "secondary" && level === "primary")) out[id] = level;
  });
  return out;
};

export type RegionEllipse = {
  readonly id: AnatomyRegionId;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
};

/** Front-view overlay anchors (viewBox 0 0 240 400). */
export const MALE_REGIONS: readonly RegionEllipse[] = [
  { id: "chest", cx: 120, cy: 98, rx: 34, ry: 22 },
  { id: "shoulders", cx: 78, cy: 88, rx: 16, ry: 14 },
  { id: "shoulders", cx: 162, cy: 88, rx: 16, ry: 14 },
  { id: "arms", cx: 68, cy: 138, rx: 12, ry: 28 },
  { id: "arms", cx: 172, cy: 138, rx: 12, ry: 28 },
  { id: "core", cx: 120, cy: 152, rx: 22, ry: 32 },
  { id: "quads", cx: 98, cy: 248, rx: 22, ry: 52 },
  { id: "quads", cx: 142, cy: 248, rx: 22, ry: 52 },
  { id: "hams", cx: 98, cy: 248, rx: 18, ry: 48 },
  { id: "hams", cx: 142, cy: 248, rx: 18, ry: 48 },
  { id: "glutes", cx: 120, cy: 198, rx: 28, ry: 16 },
  { id: "calves", cx: 92, cy: 332, rx: 12, ry: 36 },
  { id: "calves", cx: 148, cy: 332, rx: 12, ry: 36 },
  { id: "back", cx: 120, cy: 120, rx: 26, ry: 40 },
];

export const FEMALE_REGIONS: readonly RegionEllipse[] = [
  { id: "chest", cx: 120, cy: 96, rx: 30, ry: 20 },
  { id: "shoulders", cx: 86, cy: 86, rx: 14, ry: 12 },
  { id: "shoulders", cx: 154, cy: 86, rx: 14, ry: 12 },
  { id: "arms", cx: 76, cy: 136, rx: 11, ry: 26 },
  { id: "arms", cx: 164, cy: 136, rx: 11, ry: 26 },
  { id: "core", cx: 120, cy: 148, rx: 20, ry: 30 },
  { id: "quads", cx: 96, cy: 252, rx: 24, ry: 54 },
  { id: "quads", cx: 144, cy: 252, rx: 24, ry: 54 },
  { id: "hams", cx: 96, cy: 252, rx: 20, ry: 50 },
  { id: "hams", cx: 144, cy: 252, rx: 20, ry: 50 },
  { id: "glutes", cx: 120, cy: 192, rx: 32, ry: 18 },
  { id: "calves", cx: 90, cy: 330, rx: 11, ry: 34 },
  { id: "calves", cx: 150, cy: 330, rx: 11, ry: 34 },
  { id: "back", cx: 120, cy: 118, rx: 24, ry: 38 },
];
