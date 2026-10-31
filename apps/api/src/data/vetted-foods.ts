import type { CuisineStyle, MealSlot } from "@mirra/contracts";

/**
 * Vetted food catalog (v1). Values per 100 g, rounded from USDA FoodData Central
 * (cooked / as-eaten unless the id says otherwise). Static + versioned: the LLM
 * only ever picks ids from here; macros are always computed by the server.
 */
export const VETTED_FOODS_VERSION = 2;

/** Cuisine tag for staples that fit every cuisine. */
export const UNIVERSAL = "universal" as const;

export type FoodRole = "protein" | "carb" | "fat" | "veg" | "fruit" | "dairy";

export type VettedFood = {
  id: string;
  name: string;
  per100g: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  unit: { label: string; grams: number };
  roles: FoodRole[];
  slots: MealSlot[];
  /** meat fish shellfish egg dairy gluten nuts soy */
  tags: string[];
  /** Cuisines this food belongs to, or ["universal"] for staples everyone can eat. */
  cuisines: ReadonlyArray<CuisineStyle | typeof UNIVERSAL>;
  /** Portion bounds in grams (multiples of 5). */
  minG: number;
  maxG: number;
};

const ROLE: Record<string, FoodRole> = {
  p: "protein",
  c: "carb",
  f: "fat",
  v: "veg",
  r: "fruit",
  d: "dairy",
};
const SLOT: Record<string, MealSlot> = {
  B: "breakfast",
  L: "lunch",
  D: "dinner",
  S: "snack",
};

/** Compact row builder: roles "pc" and slots "BL" are letter codes. */
const food = (
  id: string,
  name: string,
  macros: [kcal: number, p: number, c: number, f: number],
  unit: [label: string, grams: number],
  roles: string,
  slots: string,
  tags: string,
  bounds: [min: number, max: number],
): Omit<VettedFood, "cuisines"> => ({
  id,
  name,
  per100g: {
    kcal: macros[0],
    proteinG: macros[1],
    carbsG: macros[2],
    fatG: macros[3],
  },
  unit: { label: unit[0], grams: unit[1] },
  roles: [...roles].map((r) => ROLE[r]!),
  slots: [...slots].map((s) => SLOT[s]!),
  tags: tags ? tags.split(" ") : [],
  minG: bounds[0],
  maxG: bounds[1],
});

const RAW_FOODS: readonly Omit<VettedFood, "cuisines">[] = [
  // Protein
  food("chicken_breast_cooked", "Chicken breast", [165, 31, 0, 3.6], ["1 palm", 120], "p", "LD", "meat", [80, 250]),
  food("turkey_breast_cooked", "Turkey breast", [135, 30, 0, 1], ["1 palm", 120], "p", "LD", "meat", [80, 250]),
  food("lean_beef_cooked", "Lean beef", [215, 26, 0, 12], ["1 palm", 100], "p", "LD", "meat", [80, 220]),
  food("salmon_cooked", "Salmon", [206, 22, 0, 12], ["1 fillet", 140], "pf", "LD", "fish", [90, 220]),
  food("cod_cooked", "Cod", [105, 23, 0, 0.9], ["1 fillet", 140], "p", "LD", "fish", [90, 250]),
  food("shrimp_cooked", "Shrimp", [99, 24, 0.2, 0.3], ["1 cup", 145], "p", "LD", "shellfish", [90, 250]),
  food("tuna_canned", "Canned tuna", [116, 26, 0, 1], ["1 can", 110], "p", "LDS", "fish", [60, 220]),
  food("eggs_whole", "Whole eggs", [143, 12.6, 0.7, 9.5], ["1 egg", 50], "p", "BLS", "egg", [50, 200]),
  food("egg_whites", "Egg whites", [52, 11, 0.7, 0.2], ["1 cup", 245], "p", "B", "egg", [60, 300]),
  food("tofu_firm", "Firm tofu", [144, 17, 3, 9], ["½ block", 125], "p", "BLD", "soy", [80, 300]),
  food("tempeh", "Tempeh", [192, 20, 7.6, 11], ["1 serving", 85], "p", "LD", "soy", [60, 200]),
  food("greek_yogurt_nonfat", "Greek yogurt (nonfat)", [59, 10, 3.6, 0.4], ["1 cup", 245], "pd", "BS", "dairy", [120, 400]),
  food("cottage_cheese_lowfat", "Cottage cheese", [82, 11, 3.4, 2.3], ["1 cup", 225], "pd", "BS", "dairy", [100, 350]),
  food("whey_protein_powder", "Whey protein", [400, 80, 8, 6], ["1 scoop", 30], "p", "BS", "dairy", [25, 60]),
  food("lentils_cooked", "Lentils", [116, 9, 20, 0.4], ["1 cup", 200], "pc", "LD", "", [100, 350]),
  food("black_beans_cooked", "Black beans", [132, 8.9, 23.7, 0.5], ["1 cup", 170], "pc", "LD", "", [80, 300]),
  food("chickpeas_cooked", "Chickpeas", [164, 8.9, 27.4, 2.6], ["1 cup", 165], "pc", "LD", "", [80, 300]),
  food("edamame", "Edamame", [121, 12, 8.9, 5.2], ["1 cup", 155], "pv", "LDS", "soy", [80, 250]),
  // Carbs
  food("white_rice_cooked", "White rice", [130, 2.7, 28, 0.3], ["1 cup", 160], "c", "LD", "", [80, 400]),
  food("brown_rice_cooked", "Brown rice", [123, 2.7, 26, 1], ["1 cup", 195], "c", "LD", "", [80, 400]),
  food("quinoa_cooked", "Quinoa", [120, 4.4, 21.3, 1.9], ["1 cup", 185], "c", "LD", "", [80, 350]),
  food("pasta_cooked", "Pasta", [158, 5.8, 31, 0.9], ["1 cup", 140], "c", "LD", "gluten", [80, 350]),
  food("sweet_potato_baked", "Sweet potato", [90, 2, 20.7, 0.2], ["1 medium", 130], "c", "LD", "", [100, 400]),
  food("potato_boiled", "Potato", [87, 1.9, 20, 0.1], ["1 medium", 150], "c", "LD", "", [100, 400]),
  food("corn_tortilla", "Corn tortillas", [218, 5.7, 44, 2.9], ["1 tortilla", 25], "c", "LD", "", [50, 150]),
  food("oats_dry", "Rolled oats", [389, 16.9, 66, 6.9], ["½ cup", 40], "c", "B", "gluten", [30, 120]),
  food("granola", "Granola", [471, 10, 64, 20], ["½ cup", 60], "c", "BS", "gluten nuts", [30, 90]),
  food("whole_wheat_bread", "Whole wheat bread", [252, 12.5, 43, 3.5], ["1 slice", 35], "c", "BLS", "gluten", [35, 140]),
  food("bagel_plain", "Plain bagel", [257, 10, 50, 1.6], ["1 bagel", 100], "c", "B", "gluten", [70, 200]),
  food("rice_cakes", "Rice cakes", [387, 8, 82, 2.8], ["3 cakes", 27], "c", "S", "", [25, 80]),
  // Fruit
  food("banana", "Banana", [89, 1.1, 23, 0.3], ["1 medium", 120], "rc", "BS", "", [100, 240]),
  food("apple", "Apple", [52, 0.3, 14, 0.2], ["1 medium", 180], "r", "BS", "", [120, 360]),
  food("orange", "Orange", [47, 0.9, 12, 0.1], ["1 medium", 130], "r", "BS", "", [100, 260]),
  food("blueberries", "Blueberries", [57, 0.7, 14, 0.3], ["1 cup", 148], "r", "BS", "", [75, 300]),
  food("strawberries", "Strawberries", [32, 0.7, 7.7, 0.3], ["1 cup", 150], "r", "BS", "", [75, 300]),
  // Veg
  food("broccoli_cooked", "Broccoli", [35, 2.4, 7.2, 0.4], ["1 cup", 156], "v", "LD", "", [80, 300]),
  food("spinach_raw", "Spinach", [23, 2.9, 3.6, 0.4], ["1 big handful", 60], "v", "BLD", "", [30, 150]),
  food("mixed_greens", "Mixed greens", [17, 1.3, 3.3, 0.2], ["1 bowl", 85], "v", "LD", "", [50, 170]),
  food("bell_pepper", "Bell pepper", [31, 1, 6, 0.3], ["1 medium", 120], "v", "LD", "", [60, 250]),
  food("tomato", "Tomato", [18, 0.9, 3.9, 0.2], ["1 medium", 120], "v", "BLD", "", [60, 250]),
  food("cucumber", "Cucumber", [15, 0.7, 3.6, 0.1], ["1 cup", 120], "v", "LS", "", [60, 250]),
  food("green_beans_cooked", "Green beans", [35, 1.9, 7.9, 0.3], ["1 cup", 125], "v", "LD", "", [80, 250]),
  food("zucchini_cooked", "Zucchini", [17, 1.1, 3.1, 0.4], ["1 cup", 180], "v", "LD", "", [90, 300]),
  food("asparagus_cooked", "Asparagus", [22, 2.4, 4.1, 0.2], ["6 spears", 90], "v", "D", "", [60, 220]),
  food("cauliflower_cooked", "Cauliflower", [23, 1.8, 4.1, 0.5], ["1 cup", 124], "v", "LD", "", [80, 300]),
  food("mushrooms_cooked", "Mushrooms", [28, 2.2, 5.3, 0.5], ["1 cup", 156], "v", "BLD", "", [60, 250]),
  food("carrots_raw", "Carrots", [41, 0.9, 9.6, 0.2], ["1 cup", 128], "v", "LS", "", [60, 250]),
  // Fat
  food("olive_oil", "Olive oil", [884, 0, 0, 100], ["1 tbsp", 15], "f", "LD", "", [5, 30]),
  food("avocado", "Avocado", [160, 2, 8.5, 14.7], ["½ avocado", 70], "f", "BLDS", "", [35, 140]),
  food("almonds", "Almonds", [579, 21, 22, 50], ["1 handful", 28], "f", "BS", "nuts", [15, 50]),
  food("walnuts", "Walnuts", [654, 15, 14, 65], ["1 handful", 28], "f", "BS", "nuts", [15, 50]),
  food("peanut_butter", "Peanut butter", [588, 25, 20, 50], ["1 tbsp", 16], "f", "BS", "nuts", [10, 40]),
  food("chia_seeds", "Chia seeds", [486, 17, 42, 31], ["1 tbsp", 12], "f", "B", "", [10, 30]),
  food("cheddar_cheese", "Cheddar cheese", [403, 25, 1.3, 33], ["1 slice", 28], "fd", "LS", "dairy", [15, 60]),
  food("hummus", "Hummus", [166, 8, 14, 10], ["¼ cup", 60], "f", "LS", "", [30, 120]),
  // Dairy / milk
  food("milk_2pct", "2% milk", [50, 3.3, 4.8, 2], ["1 cup", 245], "d", "B", "dairy", [120, 400]),
  food("soy_milk_unsweetened", "Soy milk", [33, 2.9, 1.7, 1.6], ["1 cup", 245], "d", "B", "soy", [120, 400]),
  food("almond_milk_unsweetened", "Almond milk", [15, 0.6, 0.3, 1.2], ["1 cup", 240], "d", "B", "nuts", [120, 400]),
];

/**
 * Cuisine-specific foods. Anything not listed here is a universal staple.
 * Keep enough universal protein/carb/veg/fat/fruit that any single cuisine still yields full meals.
 */
const FOOD_CUISINES: Readonly<Record<string, readonly CuisineStyle[]>> = {
  salmon_cooked: ["japanese", "american", "mediterranean", "korean"],
  cod_cooked: ["american", "mediterranean"],
  shrimp_cooked: ["chinese", "thai", "japanese", "mexican", "mediterranean", "korean"],
  tofu_firm: ["chinese", "japanese", "korean", "thai", "indian"],
  tempeh: ["other", "thai"],
  edamame: ["japanese", "korean", "chinese"],
  lentils_cooked: ["indian", "middle_eastern", "mediterranean"],
  chickpeas_cooked: ["indian", "middle_eastern", "mediterranean"],
  black_beans_cooked: ["mexican", "american"],
  corn_tortilla: ["mexican"],
  pasta_cooked: ["mediterranean", "american"],
  bagel_plain: ["american"],
  granola: ["american"],
  cheddar_cheese: ["american", "mexican"],
  cottage_cheese_lowfat: ["american", "indian", "middle_eastern"],
  hummus: ["middle_eastern", "mediterranean"],
  quinoa_cooked: ["mediterranean", "american", "other"],
  avocado: ["mexican", "american", "mediterranean", "japanese"],
  peanut_butter: ["american", "thai"],
  soy_milk_unsweetened: ["chinese", "japanese", "korean", "thai", "american"],
  almond_milk_unsweetened: ["american", "mediterranean"],
};

export const VETTED_FOODS: readonly VettedFood[] = RAW_FOODS.map((f) => ({
  ...f,
  cuisines: FOOD_CUISINES[f.id] ?? [UNIVERSAL],
}));

export const FOODS_BY_ID: ReadonlyMap<string, VettedFood> = new Map(
  VETTED_FOODS.map((f) => [f.id, f]),
);

/** Slim row sent to the LLM (no macros — server computes them). */
export type CatalogRow = {
  id: string;
  name: string;
  roles: FoodRole[];
  slots: MealSlot[];
  unit: string;
};

export const toCatalogRow = (f: VettedFood): CatalogRow => ({
  id: f.id,
  name: f.name,
  roles: f.roles,
  slots: f.slots,
  unit: `${f.unit.label} = ${f.unit.grams} g`,
});
