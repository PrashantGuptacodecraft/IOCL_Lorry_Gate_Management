import { Router } from "express";
import { z } from "zod";
import { AuditAction, UserRole } from "@prisma/client";
import { asyncHandler } from "../../lib/async-handler.js";
import { prisma } from "../../lib/prisma.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";

const auditQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.nativeEnum(AuditAction).optional(),
  entityId: z.string().trim().max(80).optional(),
});

export const auditRouter = Router();
auditRouter.use(authenticate, authorize(UserRole.SUPERVISOR, UserRole.ADMIN));

auditRouter.get(
  "/",
  validateQuery(auditQuery),
  asyncHandler(async (_req, res) => {
    const query = res.locals.validatedQuery as z.infer<typeof auditQuery>;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(query.action ? { action: query.action } : {}),
        ...(query.entityId ? { entityId: query.entityId } : {}),
      },
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { employeeCode: true, name: true, role: true } } },
    });
    res.json({ success: true, data: logs });
  }),
);
