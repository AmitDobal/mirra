#!/usr/bin/env node
/**
 * Assert sx() handles Tailwind arbitrary px values (rounded-[24px], p-[Npx], ...).
 * Usage: node scripts/check-sx.mjs   (from apps/mobile; or `pnpm check:sx`)
 * Transpiles src/theme/sx/*.ts + tokens.ts with the local TypeScript, no extra deps.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const theme = resolve(root, "src/theme");
const req = createRequire(import.meta.url);
const ts = req("typescript");

/** Relative TS import → file (`./x.ts` or `./x/index.ts`). */
const resolveTs = (from, spec) => {
  const base = resolve(dirname(from), spec);
  return [`${base}.ts`, join(base, "index.ts")].find((f) => existsSync(f)) ?? null;
};

const cache = {};
const load = (file) => {
  if (cache[file]) return cache[file].exports;
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const mod = { exports: {} };
  cache[file] = mod;
  new Function("module", "exports", "require", outputText)(mod, mod.exports, (p) => {
    const local = p.startsWith(".") ? resolveTs(file, p) : null;
    return local ? load(local) : req(p);
  });
  return mod.exports;
};

const { sx } = load(join(theme, "sx", "index.ts"));

assert.equal(sx("rounded-[24px]").borderRadius, 24, "rounded-[24px]");
assert.equal(sx("rounded-[12.5px]").borderRadius, 12.5, "rounded-[12.5px]");
assert.equal(sx("rounded-[0px]").borderRadius, 0, "rounded-[0px]");
assert.equal(sx("p-[20px]").padding, 20, "p-[20px]");
assert.equal(sx("px-[18px]").paddingHorizontal, 18, "px-[18px]");
assert.equal(sx("gap-[10px]").gap, 10, "gap-[10px]");
assert.equal(sx("min-h-[148px]").minHeight, 148, "min-h-[148px]");
assert.equal(sx("h-[56px]").height, 56, "h-[56px]");
// Existing behaviour must not regress.
assert.equal(sx("rounded-full").borderRadius, load(join(theme, "tokens.ts")).radius.full, "rounded-full");
assert.equal(sx("rounded-8").borderRadius, 8, "rounded-8");
assert.equal(sx("p-4").padding, 16, "p-4");
// Garbage stays dropped (no NaN / no crash).
assert.equal(sx("rounded-[abc]").borderRadius, undefined, "rounded-[abc]");

console.log("check-sx: ok");
