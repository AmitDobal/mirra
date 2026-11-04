#!/usr/bin/env node
// Stitch CLI: generate / edit / list / export screens via the Google Stitch MCP
// endpoint (https://stitch.googleapis.com/mcp, stateless JSON-RPC over HTTP).
//
// Auth: STITCH_API_KEY env var, else falls back to the X-Goog-Api-Key stored in
// ~/.cursor/mcp.json (mcpServers.stitch.headers). The key is never printed.
//
// Usage:
//   node scripts/stitch/generate.mjs generate --prompt-file p.md --out <dir> [--model GEMINI_3_8_FLASH]
//   node scripts/stitch/generate.mjs generate --prompt "..." --out <dir>
//   node scripts/stitch/generate.mjs edit --screen <id> --prompt "..." --out <dir>
//   node scripts/stitch/generate.mjs export --screen <id> --out <dir>
//   node scripts/stitch/generate.mjs list-screens | list-projects | list-design-systems | tools
//
// Common flags: --project <id> (default Mirra project), --design-system assets/<id>
// (default Mirra DS; pass "none" to omit), --device MOBILE|DESKTOP|TABLET|AGNOSTIC.
// Export writes <out>/screen.png, <out>/code.html, <out>/stitch.json (ids).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ENDPOINT = process.env.STITCH_MCP_URL || "https://stitch.googleapis.com/mcp";
const DEFAULT_PROJECT = "16036285274438790381"; // Mirra — AI Coach UI
const DEFAULT_DS = "assets/d2a8f52576ed4d96b4ccfe8a1a6b8539"; // Kinetic Performance
const MODELS = ["GEMINI_3_8_FLASH", "GEMINI_3_5_FLASH_LITE"];
const POLL_MS = 30_000;
const POLL_TRIES = 10;
const CALL_TIMEOUT_MS = 15 * 60_000;

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) flags[key] = true;
    else {
      flags[key] = flags[key] ? [].concat(flags[key], next) : next;
      i++;
    }
  }
  return { cmd, flags };
}

function apiKey() {
  if (process.env.STITCH_API_KEY) return process.env.STITCH_API_KEY;
  const p = join(homedir(), ".cursor", "mcp.json");
  if (existsSync(p)) {
    try {
      const k = JSON.parse(readFileSync(p, "utf8"))?.mcpServers?.stitch?.headers?.["X-Goog-Api-Key"];
      if (k) return k;
    } catch {
      /* fall through */
    }
  }
  die("No Stitch key. Create one at https://stitch.withgoogle.com (Settings > API key), then: export STITCH_API_KEY=...");
}

function die(msg) {
  console.error(`stitch: ${msg}`);
  process.exit(1);
}

let rpcId = 0;
async function callTool(name, args, { timeoutMs = 120_000 } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      signal: ctl.signal,
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } }),
    });
  } finally {
    clearTimeout(t);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${text.slice(0, 400)}`);
  const body = parseBody(text);
  if (body.error) throw new Error(`${name}: ${JSON.stringify(body.error).slice(0, 400)}`);
  const r = body.result || {};
  if (r.isError) throw new Error(`${name}: ${(r.content || []).map((c) => c.text).join(" ").slice(0, 600)}`);
  if (r.structuredContent) return r.structuredContent;
  const txt = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  try {
    return JSON.parse(txt);
  } catch {
    return { text: txt };
  }
}

function parseBody(text) {
  const t = text.trim();
  if (t.startsWith("{")) return JSON.parse(t);
  // SSE fallback: take the last data: line carrying a JSON-RPC message.
  const datas = t.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim());
  for (let i = datas.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(datas[i]);
      if (j.result || j.error) return j;
    } catch {
      /* skip */
    }
  }
  throw new Error(`unparseable response: ${t.slice(0, 200)}`);
}

const screenId = (nameOrId) => String(nameOrId).split("/").pop();

function collectScreenNames(obj, out = new Set()) {
  if (!obj || typeof obj !== "object") return out;
  if (typeof obj.name === "string" && /^projects\/\d+\/screens\/[\w-]+$/.test(obj.name)) out.add(obj.name);
  for (const v of Object.values(obj)) collectScreenNames(v, out);
  return out;
}

async function listScreens(project) {
  const r = await callTool("list_screens", { projectId: project });
  return r.screens || [];
}

async function exportScreen(project, id, outDir) {
  const name = `projects/${project}/screens/${screenId(id)}`;
  const s = await callTool("get_screen", { name });
  mkdirSync(outDir, { recursive: true });
  const meta = { project, screen: screenId(id), title: s.title, deviceType: s.deviceType, width: s.width, height: s.height };
  if (s.screenshot?.name) {
    const img = await callTool("download_file", { name: s.screenshot.name });
    const b64 = String(img.image || "").replace(/^data:[^,]+,/, "");
    if (!b64) throw new Error("screenshot download returned no image");
    writeFileSync(join(outDir, "screen.png"), Buffer.from(b64, "base64"));
    meta.screenshotFile = screenId(s.screenshot.name);
    meta.screenshotSize = img.image_metadata || img.imageMetadata;
  }
  if (s.htmlCode?.name) {
    const h = await callTool("download_file", { name: s.htmlCode.name });
    if (typeof h.html !== "string") throw new Error("html download returned no html");
    writeFileSync(join(outDir, "code.html"), h.html, "utf8");
    meta.htmlFile = screenId(s.htmlCode.name);
  }
  writeFileSync(join(outDir, "stitch.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`exported ${meta.screen} "${meta.title}" -> ${outDir}`);
  return meta;
}

function promptFrom(flags) {
  if (flags["prompt-file"]) return readFileSync(resolve(flags["prompt-file"]), "utf8");
  if (typeof flags.prompt === "string") return flags.prompt;
  die("missing --prompt or --prompt-file");
}

function genArgs(flags, project) {
  const args = { projectId: project, prompt: promptFrom(flags), deviceType: flags.device || "MOBILE" };
  const ds = flags["design-system"] ?? DEFAULT_DS;
  if (ds && ds !== "none") args.designSystem = ds;
  if (flags.model) {
    if (!MODELS.includes(flags.model)) die(`--model must be one of ${MODELS.join(", ")}`);
    args.modelId = flags.model;
  }
  return args;
}

// Runs a long generation tool; on timeout/connection error polls list_screens
// for screens that did not exist before the call.
async function runGeneration(tool, args, project) {
  const before = new Set((await listScreens(project)).map((s) => s.name));
  const t0 = Date.now();
  console.log(`${tool}: started (can take several minutes; do not retry)`);
  let names = new Set();
  try {
    const r = await callTool(tool, args, { timeoutMs: CALL_TIMEOUT_MS });
    names = collectScreenNames(r);
    for (const n of before) if (tool === "generate_screen_from_text") names.delete(n);
    const texts = JSON.stringify(r.outputComponents || r.output_components || "").slice(0, 800);
    if (texts && texts !== '""') console.log(`output_components: ${texts}`);
  } catch (e) {
    console.warn(`${tool} call failed (${e.message.slice(0, 200)}); polling for new screens`);
  }
  for (let i = 0; names.size === 0 && i < POLL_TRIES; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    for (const s of await listScreens(project)) if (!before.has(s.name)) names.add(s.name);
  }
  console.log(`${tool}: ${names.size} screen(s) in ${Math.round((Date.now() - t0) / 1000)}s`);
  return [...names];
}

async function main() {
  const { cmd, flags } = parseArgs(process.argv.slice(2));
  const project = String(flags.project || DEFAULT_PROJECT).replace(/^projects\//, "");
  const out = flags.out ? resolve(flags.out) : null;

  switch (cmd) {
    case "tools": {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "X-Goog-Api-Key": apiKey(), "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      const j = parseBody(await res.text());
      for (const t of j.result?.tools || []) console.log(t.name);
      return;
    }
    case "list-projects": {
      const r = await callTool("list_projects", {});
      for (const p of r.projects || []) console.log(`${screenId(p.name)}\t${p.title || ""}`);
      return;
    }
    case "list-design-systems": {
      const r = await callTool("list_design_systems", { projectId: project });
      for (const d of r.designSystems || []) console.log(`${d.name}\t${d.designSystem?.displayName || ""}`);
      return;
    }
    case "list-screens": {
      for (const s of await listScreens(project)) console.log(`${screenId(s.name)}\t${s.title || ""}`);
      return;
    }
    case "export": {
      if (!flags.screen || !out) die("export needs --screen <id> --out <dir>");
      await exportScreen(project, flags.screen, out);
      return;
    }
    case "generate":
    case "edit": {
      if (!out) die(`${cmd} needs --out <dir>`);
      let tool = "generate_screen_from_text";
      const args = genArgs(flags, project);
      if (cmd === "edit") {
        if (!flags.screen) die("edit needs --screen <id> (repeatable)");
        tool = "edit_screens";
        args.selectedScreenIds = [].concat(flags.screen).map(screenId);
        delete args.designSystem;
      }
      const names = await runGeneration(tool, args, project);
      if (names.length === 0) die("no screen produced; check Stitch UI, then run export --screen <id>");
      for (const [i, n] of names.entries()) {
        await exportScreen(project, n, names.length === 1 ? out : join(out, `v${i + 1}`));
      }
      return;
    }
    default:
      console.log(readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1, 18).join("\n"));
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => die(e.message));
