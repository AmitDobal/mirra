import { heuristicExerciseTagger, heuristicTag } from "../adapters/heuristic-exercise-tagger";
import { createOpenAiExerciseTagger } from "../adapters/openai-exercise-tagger";
import type { AppDB } from "../db";
import type { MirraEnv } from "../env";
import type { ExerciseTag, ExerciseTagger } from "../ports/exercise-tagger";
import { resolveAiProvider } from "./ai/resolve-provider";
import { rescaleTo100 } from "./exercise-library/tag-schema";

/**
 * Wrap a live tagger: any name it drops (Zod fail, unknown muscle, bad pct total) or a
 * thrown error falls back to the heuristic adapter, so every name gets exactly one tag.
 */
export const withHeuristicFallback = (primary: ExerciseTagger): ExerciseTagger => ({
  provider: primary.provider,
  tag: async (input) => {
    let tags: ExerciseTag[] = [];
    try {
      tags = await primary.tag(input);
    } catch (err) {
      console.warn("[exercise-tag] tagger error → heuristic", err instanceof Error ? err.message : String(err));
    }
    const byName = new Map(tags.map((t) => [t.name, t]));
    return input.names.map((name) => {
      const hit = byName.get(name);
      return hit ? { ...hit, muscles: rescaleTo100(hit.muscles) } : heuristicTag(name);
    });
  },
});

/** Provider-swappable ExerciseTagger; follows `AI_PROVIDER` like the other AI ports. */
export const getExerciseTagger = (env: MirraEnv | undefined, db?: AppDB): ExerciseTagger => {
  if (!env) return heuristicExerciseTagger;
  switch (resolveAiProvider(env)) {
    case "openai":
      return withHeuristicFallback(createOpenAiExerciseTagger(env, db));
    case "anthropic":
    case "workers-ai":
    case "heuristic":
    default:
      return heuristicExerciseTagger;
  }
};
