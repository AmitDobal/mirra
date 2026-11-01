export const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** Parse a nullable JSON text column; empty / invalid values yield `fallback`. */
export const parseJsonColumn = <T>(raw: string | null | undefined, fallback: T): T =>
  raw ? parseJson(raw, fallback) : fallback;
