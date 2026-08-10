import { describe, expect, it } from "vitest";
import { createGateEntrySchema, entryFilterSchema, IN_GATE_SAFETY_ITEMS, safetyChecklistSchema, updateGateEntrySchema } from "./index.js";

const safety = Object.fromEntries(IN_GATE_SAFETY_ITEMS.map(({ key }) => [key, true]));
const completeSafety = {
  ...safety,
  inspectionArea: "Main IN gate bay",
  sealNumber: "SEAL-1001",
  verifiedBy: "Rajesh Kumar",
  verificationNotes: "Physical inspection completed",
  exceptionRemarks: "",
};
const baseEntry = {
  crewPassId: "cd2a8191-b238-46f2-a65b-220cb5b3fb5a",
  qrScanMethod: "CAMERA",
  customerDestination: "Gorakhpur Terminal",
  actualTankTruckNumber: "up 53-gt 4821",
  abs: true,
  challanNumber: "ch-1001",
  driverPassNumber: "dp-1001",
  driverAbt: true,
  helperName: "",
  helperPassNumber: "",
  helperAbt: false,
  mobileTokenNumber: " mt - 2048 ",
  driverSignatureConfirmed: true,
  remarks: "",
  safetyChecklist: completeSafety,
};

describe("shared validation", () => {
  it("keeps exactly 12 safety items including two register columns", () => {
    expect(IN_GATE_SAFETY_ITEMS).toHaveLength(12);
    expect(IN_GATE_SAFETY_ITEMS.map((item) => item.key)).toContain("verifyRegisterColumn1");
    expect(IN_GATE_SAFETY_ITEMS.map((item) => item.key)).toContain("verifyRegisterColumn2");
  });
  it("normalizes operational identifiers", () => {
    const result = createGateEntrySchema.parse(baseEntry);
    expect(result.actualTankTruckNumber).toBe("UP53GT4821");
    expect(result.challanNumber).toBe("CH-1001");
    expect(result.mobileTokenNumber).toBe("MT-2048");
  });
  it("does not accept a browser-supplied TT match or QR snapshot fields", () => {
    expect(createGateEntrySchema.safeParse({ ...baseEntry, ttNumberMatch: true }).success).toBe(false);
    expect(createGateEntrySchema.safeParse({ ...baseEntry, driverName: "Changed" }).success).toBe(false);
  });
  it("requires every safety answer", () => {
    const { vmuWorking: _removed, ...incomplete } = completeSafety as any;
    expect(safetyChecklistSchema.safeParse(incomplete).success).toBe(false);
  });
  it("requires meaningful exception remarks when any safety answer is No", () => {
    expect(safetyChecklistSchema.safeParse({ ...completeSafety, truckTyreConditionAcceptable: false }).success).toBe(false);
    expect(safetyChecklistSchema.safeParse({ ...completeSafety, truckTyreConditionAcceptable: false, exceptionRemarks: "Tyre sidewall damage found" }).success).toBe(true);
  });
  it("requires driver confirmation", () => {
    expect(createGateEntrySchema.safeParse({ ...baseEntry, driverSignatureConfirmed: false }).success).toBe(false);
  });
  it("requires an optimistic concurrency version on edits", () => {
    expect(updateGateEntrySchema.safeParse({ remarks: "Updated" }).success).toBe(false);
    expect(updateGateEntrySchema.safeParse({ expectedVersion: 2, remarks: "Updated" }).success).toBe(true);
    expect(updateGateEntrySchema.safeParse({ expectedVersion: 2, driverSignatureConfirmed: false }).success).toBe(false);
  });
  it("parses query booleans without treating the string false as true", () => {
    expect(entryFilterSchema.parse({ includeDeleted: "false" }).includeDeleted).toBe(false);
    expect(entryFilterSchema.parse({ includeDeleted: "true" }).includeDeleted).toBe(true);
  });
});
