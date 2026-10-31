/** Small structured logger — console only, safe for React Native. */

type LogLevel = "info" | "warn" | "error";
type LogData = Record<string, unknown>;

const write = (level: LogLevel, tag: string, data?: LogData): void => {
  const line = `[mirra:${tag}]`;
  const sink =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  if (data === undefined) {
    sink(line);
    return;
  }
  sink(line, data);
};

export const logger = {
  info: (tag: string, data?: LogData) => write("info", tag, data),
  warn: (tag: string, data?: LogData) => write("warn", tag, data),
  error: (tag: string, data?: LogData) => write("error", tag, data),
};

/** Normalize unknown thrown values for log payloads. */
export const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);
