/**
 * AMI-199: ingredient groups for the diet-safety guard. Pure data.
 *
 * A group bans catalog foods by `tags` and free text (titles, recipe steps, chef replies)
 * by `terms` (whole words, plural-tolerant). `qualified` words ("burger", "sausage") are
 * banned unless a safe protein word sits right before them ("chicken burger", "veggie sausage").
 */
export type DietGroup = {
  /** Short label used in prompts ("never include: beef, pork"). */
  label: string;
  /** Catalog tags (vetted-foods `tags`) this group excludes. */
  tags: string[];
  terms: string[];
  qualified?: string[];
};

export const DIET_GROUPS = {
  beef: {
    label: "beef",
    tags: ["beef"],
    terms: [
      "beef", "steak", "veal", "brisket", "ground beef", "minced beef", "roast beef", "corned beef",
      "oxtail", "bresaola", "pastrami", "sirloin", "ribeye", "rib eye", "filet mignon", "t-bone",
      "short rib", "flank steak", "hamburger", "cheeseburger", "bolognese", "carne asada",
      "bulgogi", "galbi", "kalbi", "pho bo", "biltong", "beef jerky", "pepperoni", "salami",
      "wagyu", "angus", "picanha", "barbacoa", "birria", "suadero", "beef tallow", "tallow",
    ],
    qualified: ["burger", "patty", "patties", "meatball", "meatloaf", "mince", "jerky", "kebab", "hot dog"],
  },
  pork: {
    label: "pork",
    tags: ["pork"],
    terms: [
      "pork", "ham", "bacon", "lard", "pancetta", "prosciutto", "guanciale", "chorizo", "pepperoni",
      "salami", "carnitas", "char siu", "chashu", "tonkatsu", "katsudon", "spare rib", "spareribs",
      "pulled pork", "pork belly", "lechon", "al pastor", "mortadella", "speck", "gelatin", "gelatine",
      "baby back", "bratwurst", "kielbasa", "liverwurst", "trotter", "chicharron", "spam",
    ],
    qualified: ["sausage", "hot dog", "ribs", "meatball", "dumpling"],
  },
  red_meat: {
    label: "red meat",
    tags: ["beef", "pork", "red_meat"],
    terms: ["lamb", "mutton", "goat", "venison", "bison", "red meat"],
  },
  poultry: {
    label: "chicken and turkey",
    tags: ["poultry"],
    terms: ["chicken", "turkey", "duck", "goose", "quail"],
  },
  meat: {
    label: "meat",
    tags: ["meat"],
    terms: ["meat", "lamb", "mutton", "goat", "venison", "bison", "chicken", "turkey", "duck", "jerky", "gelatin", "gelatine"],
  },
  fish: {
    label: "fish",
    tags: ["fish"],
    terms: ["fish", "salmon", "tuna", "cod", "tilapia", "sardine", "anchovy", "anchovies", "mackerel", "trout", "halibut", "fish sauce"],
  },
  shellfish: {
    label: "shellfish",
    tags: ["shellfish"],
    terms: ["shellfish", "shrimp", "prawn", "crab", "lobster", "oyster", "mussel", "clam", "scallop", "squid", "calamari", "octopus"],
  },
  egg: { label: "eggs", tags: ["egg"], terms: ["egg", "eggs", "omelet", "omelette", "frittata", "mayonnaise", "mayo"] },
  dairy: {
    label: "dairy",
    tags: ["dairy"],
    terms: ["dairy", "milk", "cheese", "yogurt", "yoghurt", "whey", "butter", "ghee", "paneer", "cream", "curd", "cheddar"],
  },
  gluten: { label: "gluten", tags: ["gluten"], terms: ["gluten", "wheat", "barley", "rye", "seitan"] },
  nuts: { label: "nuts", tags: ["nuts"], terms: ["nut", "nuts", "peanut", "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut"] },
  soy: { label: "soy", tags: ["soy"], terms: ["soy", "tofu", "tempeh", "edamame"] },
  root_veg: {
    label: "root vegetables",
    tags: ["root_veg"],
    terms: ["potato", "potatoes", "sweet potato", "carrot", "onion", "garlic", "beetroot", "radish"],
  },
  fungi: { label: "mushrooms", tags: ["fungi"], terms: ["mushroom"] },
  honey: { label: "honey", tags: ["honey"], terms: ["honey"] },
  alcohol: { label: "alcohol", tags: ["alcohol"], terms: ["wine", "beer", "rum", "vodka", "mirin"] },
} as const satisfies Record<string, DietGroup>;

export type DietGroupId = keyof typeof DIET_GROUPS;

/** Words that make a `qualified` word safe when they sit right before it. */
export const SAFE_QUALIFIERS = [
  "chicken", "turkey", "veg", "veggie", "vegetable", "vegetarian", "vegan", "plant", "plant-based",
  "bean", "black bean", "lentil", "chickpea", "tofu", "soy", "paneer", "fish", "salmon", "tuna",
  "mushroom", "potato", "aloo", "rajma", "quinoa", "falafel", "egg",
];

/**
 * Explicit diet ids (onboarding / plan chat) → banned groups. `dietTags` is a free string list in
 * the contract, so new ids are backward compatible. Unknown ids ban nothing.
 */
export const DIET_RULES: Readonly<Record<string, readonly DietGroupId[]>> = {
  vegetarian: ["meat", "beef", "pork", "red_meat", "poultry", "fish", "shellfish"],
  eggetarian: ["meat", "beef", "pork", "red_meat", "poultry", "fish", "shellfish"],
  vegan: ["meat", "beef", "pork", "red_meat", "poultry", "fish", "shellfish", "egg", "dairy", "honey"],
  pescatarian: ["meat", "beef", "pork", "red_meat", "poultry"],
  jain: ["meat", "beef", "pork", "red_meat", "poultry", "fish", "shellfish", "egg", "root_veg", "fungi", "honey", "alcohol"],
  halal: ["pork", "alcohol"],
  kosher: ["pork", "shellfish"],
  hindu: ["beef"],
  no_beef: ["beef"],
  no_pork: ["pork"],
  no_red_meat: ["beef", "pork", "red_meat"],
  dairy_free: ["dairy"],
  gluten_free: ["gluten"],
  nut_free: ["nuts"],
  egg_free: ["egg"],
  shellfish_free: ["shellfish"],
};

/**
 * Cultural defaults by cuisine pick (conservative). Applied on top of explicit diet tags.
 * There is no UI or flag to opt out yet, so these always apply. Never inferred from a name.
 */
export const CUISINE_DEFAULTS: Readonly<Record<string, readonly DietGroupId[]>> = {
  indian: ["beef", "pork"],
  middle_eastern: ["pork"],
};

/** Profile timezone → cultural default (small, documented table; locale only, never a name). */
export const TIMEZONE_DEFAULTS: Readonly<Record<string, readonly DietGroupId[]>> = {
  "Asia/Kolkata": ["beef", "pork"],
  "Asia/Calcutta": ["beef", "pork"],
  "Asia/Kathmandu": ["beef"],
  "Asia/Karachi": ["pork"],
  "Asia/Dhaka": ["pork"],
  "Asia/Riyadh": ["pork"],
  "Asia/Dubai": ["pork"],
  "Asia/Qatar": ["pork"],
  "Asia/Kuwait": ["pork"],
};

/** Free-text avoid words → groups ("no beef", "red meat", "ham"). Others fall back to name match. */
export const AVOID_WORD_GROUPS: Readonly<Record<string, readonly DietGroupId[]>> = {
  beef: ["beef"],
  steak: ["beef"],
  veal: ["beef"],
  pork: ["pork"],
  ham: ["pork"],
  bacon: ["pork"],
  lard: ["pork"],
  gelatin: ["pork"],
  red: ["red_meat"],
  meat: ["meat", "beef", "pork", "red_meat", "poultry"],
  fish: ["fish"],
  seafood: ["fish", "shellfish"],
  shellfish: ["shellfish"],
  shrimp: ["shellfish"],
  egg: ["egg"],
  eggs: ["egg"],
  dairy: ["dairy"],
  milk: ["dairy"],
  lactose: ["dairy"],
  gluten: ["gluten"],
  wheat: ["gluten"],
  nut: ["nuts"],
  nuts: ["nuts"],
  peanut: ["nuts"],
  peanuts: ["nuts"],
  almond: ["nuts"],
  walnut: ["nuts"],
  soy: ["soy"],
  mushroom: ["fungi"],
  mushrooms: ["fungi"],
  honey: ["honey"],
  alcohol: ["alcohol"],
};
