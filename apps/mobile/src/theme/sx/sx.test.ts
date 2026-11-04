/**
 * Run: `npx tsx --test src/theme/sx/sx.test.ts` (from apps/mobile; tsx resolves extensionless imports).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { font, space, type } from "../tokens";
import { sx } from "./index";

const SCALES: readonly (readonly [string, string, string])[] = [
  ["display-lg", font.display, type.displayLg.weight],
  ["display-metric", font.display, type.displayMetric.weight],
  ["headline-lg", font.headline, type.headlineLg.weight],
  ["headline-md", font.headlineSemi, type.headlineMd.weight],
  ["headline-sm", font.headlineSemi, type.headlineSm.weight],
  ["body-lg", font.bodyMedium, type.bodyLg.weight],
  ["body-md", font.body, type.bodyMd.weight],
  ["body-sm", font.body, type.bodySm.weight],
  ["label-lg", font.label, type.labelLg.weight],
  ["label-md", font.label, type.labelMd.weight],
  ["label-caps", font.labelBold, type.labelCaps.weight],
];

const WEIGHT_IN_FACE: Record<string, string> = {
  "400": "Regular",
  "500": "Medium",
  "600": "SemiBold",
  "700": "Bold",
};

test("font-<scale> picks the DESIGN family face with the DESIGN weight", () => {
  for (const [scale, face, weight] of SCALES) {
    const style = sx(`font-${scale}`);
    assert.equal(style.fontFamily, face, scale);
    assert.ok(String(style.fontFamily).endsWith(WEIGHT_IN_FACE[weight]), `${scale} weight ${weight}`);
  }
});

test("text-<scale> keeps size + line height", () => {
  assert.deepEqual(sx("text-headline-lg"), {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: type.headlineLg.tracking * 28,
  });
  assert.deepEqual(sx("text-body-md"), { fontSize: 14, lineHeight: 20 });
});

test("absolute offsets: left-0 right-0 top-N bottom-N and negatives", () => {
  assert.deepEqual(sx("absolute bottom-0 left-0 right-0"), {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  });
  assert.deepEqual(sx("top-2 bottom-4"), { top: 8, bottom: 16 });
  assert.deepEqual(sx("-bottom-1 -right-1"), { bottom: -4, right: -4 });
  assert.deepEqual(sx("top-[3px] left-margin"), { top: 3, left: space.margin });
});

test("existing classes are unchanged by the split", () => {
  assert.deepEqual(sx("w-full h-full min-w-0"), { width: "100%", height: "100%", minWidth: 0 });
  assert.deepEqual(sx("px-5 py-1.5 gap-space-sm"), { paddingHorizontal: 20, paddingVertical: 6, gap: 8 });
  assert.deepEqual(sx("rounded-[24px] rounded-lg"), { borderRadius: 32 });
  assert.deepEqual(sx("bg-primary-fixed/40"), { backgroundColor: "#cbf15066" });
  assert.deepEqual(sx("border border-0"), { borderWidth: 0 });
  assert.deepEqual(sx("font-headline font-bold"), { fontFamily: font.headline, fontWeight: "700" });
  assert.deepEqual(sx("text-lg leading-tight"), { fontSize: 18, lineHeight: 26 });
});

test("every font-* class used in src resolves", () => {
  const root = join(__dirname, "..", "..");
  const used = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) {
        for (const m of readFileSync(path, "utf8").matchAll(/(?<![\w-])font-[a-z][a-z-]*\b/g)) used.add(m[0]);
      }
    }
  };
  walk(root);
  assert.ok(used.has("font-headline-lg"));
  for (const cls of used) {
    const style = sx(cls);
    assert.ok(style.fontFamily !== undefined || style.fontWeight !== undefined, `${cls} does not resolve`);
  }
});
