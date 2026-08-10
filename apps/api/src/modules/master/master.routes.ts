import { Router } from "express";
import { UserRole } from "@prisma/client";
import { asyncHandler } from "../../lib/async-handler.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";

export const masterRouter = Router();
masterRouter.use(authenticate, authorize(UserRole.ENTRY_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN));
masterRouter.get(
  "/destinations",
  asyncHandler(async (_req, res) => {
    const items = await prisma.customerDestination.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });
    res.json({ success: true, data: items });
  }),
);
