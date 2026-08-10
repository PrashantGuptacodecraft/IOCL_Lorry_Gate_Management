import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler } from "express";
import { ApiError } from "../lib/api-error.js";
import { logger } from "../lib/logger.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let normalized: unknown = error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta?.target.join(",") : String(error.meta?.target ?? "");
      if (target.includes("mobileTokenNumber") || target.includes("business_date_mobile_token")) {
        normalized = new ApiError(409, "DUPLICATE_MOBILE_TOKEN", "This mobile token number is already used today");
      } else if (target.includes("one_open_truck") || target.includes("actualTankTruckNumber")) {
        normalized = new ApiError(409, "TRUCK_ALREADY_IN", "This tank truck already has an open IN entry");
      } else if (target.includes("one_open_crew_pass") || target.includes("crewPassId")) {
        normalized = new ApiError(409, "CREW_ALREADY_IN", "This crew pass already has an open IN entry");
      } else if (target.includes("invoiceNumber") || target.includes("invoice_number")) {
        normalized = new ApiError(409, "DUPLICATE_INVOICE", "This invoice number has already been submitted");
      } else {
        normalized = new ApiError(409, "DUPLICATE_RECORD", "A conflicting record already exists");
      }
    } else if (error.code === "P2025") {
      normalized = new ApiError(409, "VERSION_CONFLICT", "This record changed on another device. Reload and try again.");
    } else if (error.code === "P2034") {
      normalized = new ApiError(409, "CONCURRENT_REQUEST", "Another gate request was processed at the same time. Please retry.");
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    normalized = new ApiError(503, "DATABASE_UNAVAILABLE", "The database is temporarily unavailable");
  }

  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong. Please try again.";
  let details: unknown;

  if (normalized instanceof ApiError) {
    status = normalized.statusCode;
    code = normalized.code;
    message = normalized.message;
    details = normalized.details;
  }

  if (status >= 500) {
    logger.error("request_failed", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      error: normalized instanceof Error ? normalized.message : String(normalized),
    });
  } else {
    logger.warn("request_rejected", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status,
      code,
    });
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details && typeof details === "object" ? details : {}),
      requestId: req.requestId,
    },
  });
};
