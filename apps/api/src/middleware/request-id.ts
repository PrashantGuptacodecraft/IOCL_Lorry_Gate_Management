import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{8,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction) {
  const supplied = req.header("x-request-id")?.trim();
  req.requestId = supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
