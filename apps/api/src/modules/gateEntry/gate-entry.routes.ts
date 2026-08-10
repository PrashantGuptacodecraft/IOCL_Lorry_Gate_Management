import { Router, type Request } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import {
  bulkDeleteSchema,
  createGateEntrySchema,
  deleteEntrySchema,
  entryFilterSchema,
  invoiceQrResolveSchema,
  submitExitSchema,
  updateExitQuantitiesSchema,
  updateGateEntrySchema,
} from "@iocl/shared";
import { asyncHandler } from "../../lib/async-handler.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate.js";
import * as service from "./gate-entry.service.js";

const idParams = z.object({ id: z.string().uuid() }).strict();
const allOperationalRoles = [UserRole.ENTRY_GATE_SECURITY, UserRole.EXIT_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN] as const;

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.header("user-agent")?.slice(0, 500), requestId: req.requestId };
}

function csvCell(value: unknown) {
  const raw = value == null ? "" : String(value);
  const safe = /^[\s\u0000-\u001F]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export const gateEntryRouter = Router();
gateEntryRouter.use(authenticate);

gateEntryRouter.get(
  "/",
  authorize(...allOperationalRoles),
  validateQuery(entryFilterSchema),
  asyncHandler(async (req, res) => {
    const data = await service.listEntries(res.locals.validatedQuery, req.auth!);
    res.json({ success: true, data });
  }),
);

gateEntryRouter.get(
  "/export.csv",
  authorize(UserRole.SUPERVISOR, UserRole.ADMIN),
  validateQuery(entryFilterSchema),
  asyncHandler(async (req, res) => {
    const items = await service.listForExport(res.locals.validatedQuery, req.auth!);
    const headers = [
      "SL.NO", "Date", "Status", "Customer / Destination", "Tank Truck No", "ABS", "Challan No", "Time In", "Time Out",
      "MS", "XPMS", "EBMS", "HSD", "SKO", "XG", "BIO HSD", "FO", "LDO", "Lock No", 
      "Driver", "Crew ID", "DL No", "DL Expiry", "Pass Valid Upto", "TT No on Pass",
      "TT Match", "Driver Pass", "Driver ABT", "Helper", "Helper Pass", "Helper ABT", "Mobile Token", "Driver Confirmation",
      "Invoice No", "Invoice Date", "Consignee", "Remarks", "Created By", "Exit By",
    ];
    const rows = items.map((entry) => [
      entry.serialNumber, entry.businessDate.toISOString().slice(0, 10), entry.status, entry.customerDestination,
      entry.actualTankTruckNumber, entry.abs ? "YES" : "NO", entry.challanNumber, entry.timeIn.toISOString(), entry.timeOut?.toISOString() ?? "",
      entry.qtyMs, entry.qtyXpms, entry.qtyEbms, entry.qtyHsd, entry.qtySko, entry.qtyXg, entry.qtyBioHsd, entry.qtyFo, entry.qtyLdo, entry.lockNumber ?? "",
      entry.driverName, entry.crewId, entry.drivingLicenseNumber,
      entry.drivingLicenseExpiryDate.toISOString().slice(0, 10), entry.passValidUntil.toISOString().slice(0, 10), entry.ttNumberOnPass,
      entry.ttNumberMatch ? "YES" : "NO", entry.driverPassNumber, entry.driverAbt ? "YES" : "NO", entry.helperName ?? "",
      entry.helperPassNumber ?? "", entry.helperAbt ? "YES" : "NO", entry.mobileTokenNumber,
      entry.driverSignatureConfirmed ? "CONFIRMED" : "NOT CONFIRMED", entry.invoiceNumber ?? "", entry.invoiceDate?.toISOString().slice(0, 10) ?? "",
      entry.invoiceConsignee ?? "", entry.remarks ?? "", entry.createdBy.employeeCode, entry.exitCreatedBy?.employeeCode ?? "",
    ]);

    const totalMs = items.reduce((sum, item) => sum + (parseFloat(item.qtyMs || "0") || 0), 0);
    const totalXpms = items.reduce((sum, item) => sum + (parseFloat(item.qtyXpms || "0") || 0), 0);
    const totalEbms = items.reduce((sum, item) => sum + (parseFloat(item.qtyEbms || "0") || 0), 0);
    const totalHsd = items.reduce((sum, item) => sum + (parseFloat(item.qtyHsd || "0") || 0), 0);
    const totalSko = items.reduce((sum, item) => sum + (parseFloat(item.qtySko || "0") || 0), 0);
    const totalXg = items.reduce((sum, item) => sum + (parseFloat(item.qtyXg || "0") || 0), 0);
    const totalBioHsd = items.reduce((sum, item) => sum + (parseFloat(item.qtyBioHsd || "0") || 0), 0);
    const totalFo = items.reduce((sum, item) => sum + (parseFloat(item.qtyFo || "0") || 0), 0);
    const totalLdo = items.reduce((sum, item) => sum + (parseFloat(item.qtyLdo || "0") || 0), 0);

    const totalsRow = [
      "TOTALS", "", "", "", "", "", "", "", "",
      totalMs.toFixed(3), totalXpms.toFixed(3), totalEbms.toFixed(3), totalHsd.toFixed(3),
      totalSko.toFixed(3), totalXg.toFixed(3), totalBioHsd.toFixed(3), totalFo.toFixed(3), totalLdo.toFixed(3), "",
      "", "", "", "", "", "",
      "", "", "", "", "", "", "", "",
      "", "", "", "", "", "",
    ];
    rows.push(totalsRow);

    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="iocl-gate-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  }),
);

gateEntryRouter.post(
  "/exit/resolve",
  authorize(UserRole.EXIT_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN),
  validateBody(invoiceQrResolveSchema),
  asyncHandler(async (req, res) => {
    const data = await service.resolveInvoice(req.body.rawInvoiceQr);
    res.json({ success: true, data });
  }),
);

gateEntryRouter.post(
  "/bulk-delete",
  authorize(UserRole.ADMIN),
  validateBody(bulkDeleteSchema),
  asyncHandler(async (req, res) => {
    const data = await service.bulkSoftDelete(req.body, req.auth!, meta(req));
    res.json({ success: true, data, message: `${data.count} record(s) soft deleted` });
  }),
);

gateEntryRouter.get(
  "/:id",
  authorize(...allOperationalRoles),
  validateParams(idParams),
  asyncHandler(async (req, res) => {
    const data = await service.getEntry(res.locals.validatedParams.id, req.auth!);
    res.json({ success: true, data });
  }),
);

gateEntryRouter.post(
  "/",
  authorize(UserRole.ENTRY_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN),
  validateBody(createGateEntrySchema),
  asyncHandler(async (req, res) => {
    const data = await service.createEntry(req.body, req.auth!, meta(req));
    res.status(201).json({ success: true, data, message: "Vehicle IN entry created successfully" });
  }),
);

gateEntryRouter.patch(
  "/:id",
  authorize(UserRole.ENTRY_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN),
  validateParams(idParams),
  validateBody(updateGateEntrySchema),
  asyncHandler(async (req, res) => {
    const data = await service.updateEntry(res.locals.validatedParams.id, req.body, req.auth!, meta(req));
    res.json({ success: true, data, message: "IN entry updated" });
  }),
);

gateEntryRouter.post(
  "/:id/exit",
  authorize(UserRole.EXIT_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN),
  validateParams(idParams),
  validateBody(submitExitSchema),
  asyncHandler(async (req, res) => {
    const data = await service.submitExit(res.locals.validatedParams.id, req.body, req.auth!, meta(req));
    res.json({ success: true, data, message: "Vehicle OUT completed and entry locked" });
  }),
);

gateEntryRouter.patch(
  "/:id/exit-quantities",
  authorize(UserRole.EXIT_GATE_SECURITY, UserRole.SUPERVISOR, UserRole.ADMIN),
  validateParams(idParams),
  validateBody(updateExitQuantitiesSchema),
  asyncHandler(async (req, res) => {
    const data = await service.updateExitQuantities(res.locals.validatedParams.id, req.body, req.auth!, meta(req));
    res.json({ success: true, data, message: "OUT quantities updated" });
  }),
);

gateEntryRouter.post(
  "/:id/restore",
  authorize(UserRole.ADMIN),
  validateParams(idParams),
  asyncHandler(async (req, res) => {
    const data = await service.restoreEntry(res.locals.validatedParams.id, req.auth!, meta(req));
    res.json({ success: true, data, message: "Record restored and audited" });
  }),
);

gateEntryRouter.delete(
  "/:id",
  authorize(UserRole.ADMIN),
  validateParams(idParams),
  validateBody(deleteEntrySchema),
  asyncHandler(async (req, res) => {
    const data = await service.softDeleteEntry(res.locals.validatedParams.id, req.body, req.auth!, meta(req));
    res.json({ success: true, data, message: "Record soft deleted" });
  }),
);
