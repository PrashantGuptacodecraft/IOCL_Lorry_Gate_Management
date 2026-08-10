import { z } from "zod";

const ttlPattern = /^\d+[smhd]$/i;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.string().url()).min(1)),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().regex(ttlPattern).default("10m"),
  JWT_REFRESH_TTL: z.string().regex(ttlPattern).default("7d"),
  SESSION_MAX_TTL: z.string().regex(ttlPattern).default("8h"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("strict"),
  COOKIE_DOMAIN: z.string().trim().optional().transform((value) => value || undefined),
  COOKIE_NAME: z.string().trim().min(3).max(60).default("iocl_refresh"),
  FACILITY_CODE: z.string().trim().min(2).max(30).default("IOCL-DEMO"),
  GATE_CODE: z.string().trim().min(2).max(30).default("IN-GATE-01"),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}
if (parsed.data.COOKIE_SAME_SITE === "none" && !parsed.data.COOKIE_SECURE) {
  throw new Error("COOKIE_SAME_SITE=none requires COOKIE_SECURE=true");
}

export const env = parsed.data;
