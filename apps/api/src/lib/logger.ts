import { env } from "../config/env.js";

type Level = "debug" | "info" | "warn" | "error";
const rank: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function write(level: Level, message: string, fields: Record<string, unknown> = {}) {
  if (rank[level] < rank[env.LOG_LEVEL]) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service: "iocl-lorry-gate-api",
    message,
    ...fields,
  };
  const output = JSON.stringify(payload);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields),
};
