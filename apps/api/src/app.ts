import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimitPkg from "express-rate-limit";
import helmetPkg from "helmet";

const rateLimit = (rateLimitPkg as any).default || rateLimitPkg;
const helmet = (helmetPkg as any).default || helmetPkg;
import { env } from "./config/env.js";
import { ApiError } from "./lib/api-error.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestId } from "./middleware/request-id.js";
import { requestLogger } from "./middleware/request-logger.js";
import { apiRouter } from "./routes/index.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(requestId);
app.use(requestLogger);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "no-referrer" },
  }),
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.WEB_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, "CORS_ORIGIN_DENIED", "The request origin is not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "256kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "64kb", parameterLimit: 100 }));
app.use(cookieParser());
app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "iocl-lorry-gate-api", time: new Date().toISOString() });
});
app.get("/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", database: "ok", time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "not-ready", database: "unavailable", time: new Date().toISOString() });
  }
});
app.use("/api/v1", apiRouter);
app.use((_req, _res, next) => next(new ApiError(404, "NOT_FOUND", "Route not found")));
app.use(errorHandler);
