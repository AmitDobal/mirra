/**
 * Builds `src/data/strength-standards/{male,female}.ts` (arch §6.1, AMI-165).
 *
 *   curl -LO https://openpowerlifting.gitlab.io/opl-csv/files/openpowerlifting-latest.zip && unzip it
 *   npx tsx scripts/build-standards.ts /path/to/openpowerlifting-YYYY-MM-DD-*.csv
 *
 * Source: OpenPowerlifting bulk CSV (public domain; https://www.openpowerlifting.org,
 * https://gitlab.com/openpowerlifting/opl-data). The CSV is ~800 MB and is NOT committed.
 *
 * Method:
 * 1. Raw (unequipped) entries, sex M/F, age 18-49 (or unknown), bodyweight 30..200 kg. One entry per lifter and lift
 *    (their best successful attempt, with the bodyweight of that meet).
 * 2. Bucket by 10 kg bodyweight class (40..140), quantiles per sex × class × lift.
 * 3. OPL competitors are much stronger than gym users, so each of our anchors T5..T95 reads
 *    the OPL quantile in GYM_TO_OPL_Q and multiplies it by a per-lift scale. The scale is
 *    calibrated once so male 80 kg lands on CALIBRATION (bodyweight multiples, arch §6.1).
 *    Sex and bodyweight shape therefore come from OPL; the level from the calibration.
 * 4. Overhead press = 0.62 × bench. Pull-up, push-up and plank are hand-set below.
 */
import { createReadStream, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

type Lift = "back_squat" | "bench_press" | "deadlift";
type Sex = "male" | "female";
type Row = [number, number, number, number, number, number];

const LIFTS: Lift[] = ["back_squat", "bench_press", "deadlift"];
const CLASSES = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140];
const MIN_SAMPLES = 300;

/** OPL quantile read for our T5 / T20 / T50 / T80 / T95. */
const GYM_TO_OPL_Q = [0.02, 0.1, 0.35, 0.7, 0.95] as const;

/** Male 80 kg targets as bodyweight multiples (arch §6.1). */
const CALIBRATION: Record<Lift, readonly number[]> = {
  bench_press: [0.5, 0.75, 1.0, 1.25, 1.5],
  back_squat: [0.75, 1.0, 1.4, 1.8, 2.25],
  deadlift: [1.0, 1.3, 1.7, 2.1, 2.6],
};

const OHP_OF_BENCH = 0.62;

/** Allometric shape for the hand-set lifts: T(bw) = mult × ref × (bw / ref)^0.67. */
const allometric = (mults: readonly number[], ref: number, bw: number): number[] =>
  mults.map((m) => m * ref * (bw / ref) ** 0.67);

/**
 * Pull-up, in e1RM kg of effective load (bw × 1.0 + added), as multiples of bw at the ref weight.
 * 1.03 = one strict rep; 1.27 ≈ 8 reps; 1.5 ≈ +10 kg × 8 or 15 reps; 1.8 ≈ +25 kg × 8.
 * Female: 0.75 = below one rep (band-assisted territory), 1.03 = one rep, 1.2 ≈ 5 reps.
 */
const PULL_UP: Record<Sex, { ref: number; mults: readonly number[] }> = {
  male: { ref: 80, mults: [0.85, 1.03, 1.25, 1.5, 1.8] },
  female: { ref: 60, mults: [0.55, 0.75, 1.0, 1.2, 1.45] },
};

/**
 * Push-up, in e1RM kg of 0.65 × bw: 0.65 × (1 + reps/30) × bw.
 * Male reps ≈ 3 / 10 / 22 / 35 / 50; female reps ≈ 0 / 3 / 10 / 22 / 35.
 */
const PUSH_UP: Record<Sex, { ref: number; mults: readonly number[] }> = {
  male: { ref: 80, mults: [0.715, 0.867, 1.127, 1.408, 1.733] },
  female: { ref: 60, mults: [0.6, 0.715, 0.867, 1.127, 1.408] },
};

/** Plank, seconds held (flat across bodyweight). Typical gym norms: 20 s weak, 75 s median, 3 min strong. */
const PLANK: Record<Sex, readonly number[]> = {
  male: [20, 40, 75, 120, 180],
  female: [20, 40, 70, 110, 170],
};

// ── CSV ────────────────────────────────────────────────────────────────────
const splitCsv = (line: string): string[] => {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
};

/** Adults 18-49 (youth and masters skew light / heavy classes). Unknown age is kept. */
const adultAge = (age: string, ageClass: string): boolean => {
  const a = age ? Number(age) : Number(ageClass.split("-")[0]);
  return !Number.isFinite(a) || (!age && !ageClass) || (a >= 18 && a < 50);
};

type Best = { kg: number; bw: number };
type Lifter = Partial<Record<Lift, Best>>;

const readLifters = async (path: string): Promise<{ lifters: Map<string, Lifter>; snapshot: string }> => {
  const lifters = new Map<string, Lifter>();
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let col: Record<string, number> | null = null;
  let snapshot = "";
  for await (const line of rl) {
    const f = splitCsv(line);
    if (!col) {
      col = Object.fromEntries(f.map((name, i) => [name, i]));
      continue;
    }
    if (f[col.Equipment!] !== "Raw") continue;
    const sex = f[col.Sex!];
    if (sex !== "M" && sex !== "F") continue;
    const bw = Number(f[col.BodyweightKg!]);
    if (!(bw >= 30 && bw <= 200)) continue;
    if (!adultAge(f[col.Age!] ?? "", f[col.AgeClass!] ?? "")) continue;
    const date = f[col.Date!] ?? "";
    if (date > snapshot) snapshot = date;
    const key = `${sex}|${f[col.Name!]}`;
    const entry = lifters.get(key) ?? {};
    const lifts: [Lift, string][] = [["back_squat", "Best3SquatKg"], ["bench_press", "Best3BenchKg"], ["deadlift", "Best3DeadliftKg"]];
    for (const [lift, name] of lifts) {
      const kg = Number(f[col[name]!]);
      if (!(kg >= 20 && kg <= 3.5 * bw + 100)) continue;
      if (!entry[lift] || kg > entry[lift]!.kg) entry[lift] = { kg, bw };
    }
    lifters.set(key, entry);
  }
  return { lifters, snapshot };
};

const quantile = (sorted: readonly number[], q: number): number => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};

const classOf = (bw: number): number => Math.max(40, Math.min(140, Math.round(bw / 10) * 10));

type Buckets = Record<Sex, Record<Lift, Map<number, number[]>>>;

const bucketize = (lifters: Map<string, Lifter>): Buckets => {
  const empty = (): Record<Lift, Map<number, number[]>> => ({
    back_squat: new Map(), bench_press: new Map(), deadlift: new Map(),
  });
  const b: Buckets = { male: empty(), female: empty() };
  for (const [key, entry] of lifters) {
    const sex: Sex = key.startsWith("M|") ? "male" : "female";
    for (const lift of LIFTS) {
      const best = entry[lift];
      if (!best) continue;
      const c = classOf(best.bw);
      const arr = b[sex][lift].get(c) ?? [];
      arr.push(best.kg);
      b[sex][lift].set(c, arr);
    }
  }
  for (const sex of ["male", "female"] as Sex[]) for (const lift of LIFTS) for (const arr of b[sex][lift].values()) arr.sort((x, y) => x - y);
  return b;
};

/** OPL quantiles per class; thin classes borrow the nearest valid class, scaled allometrically. */
const oplRows = (byClass: Map<number, number[]>): { rows: Map<number, number[]>; n: Map<number, number> } => {
  const valid = CLASSES.filter((c) => (byClass.get(c)?.length ?? 0) >= MIN_SAMPLES);
  const rows = new Map<number, number[]>();
  const n = new Map<number, number>();
  for (const c of CLASSES) {
    const src = valid.includes(c) ? c : valid.reduce((a, v) => (Math.abs(v - c) < Math.abs(a - c) ? v : a));
    const sorted = byClass.get(src)!;
    const k = (c / src) ** 0.67;
    const prev = rows.get(c - 10);
    // Heavier classes never get a lower anchor than the class below (sampling noise).
    rows.set(c, GYM_TO_OPL_Q.map((q, i) => Math.max(quantile(sorted, q) * k, prev?.[i] ?? 0)));
    n.set(c, byClass.get(c)?.length ?? 0);
  }
  return { rows, n };
};

const r1 = (v: number): number => Math.round(v * 10) / 10;

/** Anchors strictly increasing within a row. */
const monotone = (xs: number[]): number[] => {
  const out = [...xs];
  for (let i = 1; i < out.length; i += 1) if (out[i]! <= out[i - 1]!) out[i] = out[i - 1]! + 0.5;
  return out;
};

const toRow = (bw: number, xs: number[]): Row => [bw, ...monotone(xs).map(r1)] as Row;

const main = async () => {
  const csv = process.argv[2];
  if (!csv) {
    console.error("usage: tsx scripts/build-standards.ts <openpowerlifting.csv>");
    process.exit(2);
  }
  const { lifters, snapshot } = await readLifters(csv);
  const buckets = bucketize(lifters);
  console.log(`lifters ${lifters.size}, newest meet ${snapshot}`);

  const opl: Record<Sex, Record<Lift, ReturnType<typeof oplRows>>> = {
    male: { back_squat: oplRows(buckets.male.back_squat), bench_press: oplRows(buckets.male.bench_press), deadlift: oplRows(buckets.male.deadlift) },
    female: { back_squat: oplRows(buckets.female.back_squat), bench_press: oplRows(buckets.female.bench_press), deadlift: oplRows(buckets.female.deadlift) },
  };

  // Calibrate: one scale per lift × anchor so male 80 kg hits CALIBRATION.
  const scales = {} as Record<Lift, number[]>;
  for (const lift of LIFTS) {
    const ref = opl.male[lift].rows.get(80)!;
    scales[lift] = CALIBRATION[lift].map((m, i) => (m * 80) / ref[i]!);
  }
  console.log("scales", JSON.stringify(Object.fromEntries(LIFTS.map((l) => [l, scales[l].map((s) => r1(s * 100) / 100)]))));

  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, "../src/data/strength-standards");
  for (const sex of ["male", "female"] as Sex[]) {
    const table: Record<string, Row[]> = {};
    for (const lift of LIFTS) table[lift] = CLASSES.map((c) => toRow(c, opl[sex][lift].rows.get(c)!.map((v, i) => v * scales[lift][i]!)));
    table.overhead_press = table.bench_press!.map((r) => toRow(r[0], r.slice(1).map((v) => v * OHP_OF_BENCH)));
    table.pull_up = CLASSES.map((c) => toRow(c, allometric(PULL_UP[sex].mults, PULL_UP[sex].ref, c)));
    table.push_up = CLASSES.map((c) => toRow(c, allometric(PUSH_UP[sex].mults, PUSH_UP[sex].ref, c)));
    table.plank = CLASSES.map((c) => toRow(c, [...PLANK[sex]]));

    const counts = LIFTS.map((l) => `${l}: ${CLASSES.map((c) => `${c}=${opl[sex][l].n.get(c)}`).join(" ")}`);
    const name = sex === "male" ? "MALE_STANDARDS" : "FEMALE_STANDARDS";
    const body = Object.entries(table)
      .map(([k, rows]) => `  ${k}: [\n${rows.map((r) => `    [${r.join(", ")}],`).join("\n")}\n  ],`)
      .join("\n");
    const file = `/**
 * GENERATED by scripts/build-standards.ts. Do not edit by hand.
 * Source: OpenPowerlifting bulk CSV, snapshot ${snapshot} (public domain, https://www.openpowerlifting.org).
 * Raw entries, adults 18-49, one best lift per lifter, 10 kg bodyweight classes, calibrated to a gym population
 * (GYM_TO_OPL_Q + male 80 kg bodyweight multiples, arch §6.1). OHP = 0.62 × bench.
 * Pull-up / push-up / plank are hand-set in the script. Version: see ./version.ts.
 * Rows: [bodyweightKg, T5, T20, T50, T80, T95]; e1RM kg (plank: seconds).
 * OPL samples per class (${sex}): ${counts.join("; ")}
 */
import type { StandardsTable } from "./types";

export const ${name}: StandardsTable = {
${body}
};
`;
    writeFileSync(join(outDir, `${sex}.ts`), file);
    console.log(`wrote ${sex}.ts`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
