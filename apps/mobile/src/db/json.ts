export const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const toJson = (value: unknown): string => JSON.stringify(value);
