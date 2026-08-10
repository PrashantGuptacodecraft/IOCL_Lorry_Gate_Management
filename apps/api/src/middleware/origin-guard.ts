import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../lib/api-error.js";

export function requireTrustedOrigin(req: Request, _res: Response, next: NextFunction) {
  const origin = req.header("origin");
  const fetchSite = req.header("sec-fetch-site");

  if (origin && env.WEB_ORIGINS.includes(origin)) return next();
  if (!origin && env.NODE_ENV !== "production") return next();
  if (!origin && fetchSite === "same-origin") return next();

  return next(new ApiError(403, "UNTRUSTED_ORIGIN", "The request origin is not allowed"));
}
