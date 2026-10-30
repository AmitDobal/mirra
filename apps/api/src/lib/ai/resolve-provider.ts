import type { MirraEnv } from "../../env";

/** Supported AI backends — add ids here when an adapter ships. */
export type AiProviderId =
  | "openai"
  | "heuristic"
  | "anthropic"
  | "workers-ai";

const KNOWN: ReadonlySet<string> = new Set([
  "openai",
  "heuristic",
  "anthropic",
  "workers-ai",
]);

/**
 * Explicit `AI_PROVIDER` wins. Otherwise: OpenAI key → openai, else heuristic.
 * Unknown / not-ready providers fall back to openai-if-keyed else heuristic.
 */
export const resolveAiProvider = (env: MirraEnv): AiProviderId => {
  const raw = env.AI_PROVIDER?.trim().toLowerCase();
  if (raw && KNOWN.has(raw)) {
    const id = raw as AiProviderId;
    if (id === "openai" && !env.OPENAI_API_KEY?.trim()) return "heuristic";
    if (id === "anthropic" && !env.ANTHROPIC_API_KEY?.trim()) {
      console.warn("[ai] AI_PROVIDER=anthropic but no ANTHROPIC_API_KEY; heuristic");
      return "heuristic";
    }
    if (id === "workers-ai") {
      console.warn("[ai] workers-ai adapter not shipped yet; heuristic");
      return "heuristic";
    }
    return id;
  }
  if (env.OPENAI_API_KEY?.trim()) return "openai";
  return "heuristic";
};
