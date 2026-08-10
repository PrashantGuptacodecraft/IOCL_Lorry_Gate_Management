-- Full Lorry Gate MVP expansion: OUT flow, register quantities, soft delete,
-- user management audit actions, and safe migration to the 12-point checklist.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EXIT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BULK_DELETE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';

ALTER TABLE "gate_entries"
  ADD COLUMN "driverAbt" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "helperAbt" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "driverSignatureConfirmed" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "qtyMs" DECIMAL(14,3),
  ADD COLUMN "qtyXpms" DECIMAL(14,3),
  ADD COLUMN "qtyEbms" DECIMAL(14,3),
  ADD COLUMN "qtyHsd" DECIMAL(14,3),
  ADD COLUMN "invoiceNumber" VARCHAR(60),
  ADD COLUMN "invoiceDate" DATE,
  ADD COLUMN "invoiceValue" DECIMAL(16,2),
  ADD COLUMN "invoiceVehicle" VARCHAR(20),
  ADD COLUMN "invoiceConsignee" VARCHAR(200),
  ADD COLUMN "invoiceProductsRaw" VARCHAR(1000),
  ADD COLUMN "exitCreatedById" UUID,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "deletedAt" TIMESTAMPTZ,
  ADD COLUMN "deletedById" UUID,
  ADD COLUMN "deleteReason" VARCHAR(300);

ALTER TABLE "gate_entries"
  ADD CONSTRAINT "gate_entries_exitCreatedById_fkey"
    FOREIGN KEY ("exitCreatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "gate_entries_deletedById_fkey"
    FOREIGN KEY ("deletedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "gate_entries_qty_non_negative_check" CHECK (
    ("qtyMs" IS NULL OR "qtyMs" >= 0) AND
    ("qtyXpms" IS NULL OR "qtyXpms" >= 0) AND
    ("qtyEbms" IS NULL OR "qtyEbms" >= 0) AND
    ("qtyHsd" IS NULL OR "qtyHsd" >= 0)
  ),
  ADD CONSTRAINT "gate_entries_invoice_value_non_negative_check" CHECK (
    "invoiceValue" IS NULL OR "invoiceValue" >= 0
  );

CREATE UNIQUE INDEX "gate_entries_invoiceNumber_key" ON "gate_entries"("invoiceNumber");
CREATE INDEX "gate_entries_exitCreatedById_businessDate_idx" ON "gate_entries"("exitCreatedById", "businessDate");

DROP INDEX IF EXISTS "gate_entries_businessDate_status_timeIn_idx";
DROP INDEX IF EXISTS "gate_entries_actualTankTruckNumber_status_idx";
CREATE INDEX "gate_entries_businessDate_isDeleted_status_timeIn_idx"
  ON "gate_entries"("businessDate", "isDeleted", "status", "timeIn");
CREATE INDEX "gate_entries_actualTankTruckNumber_isDeleted_status_idx"
  ON "gate_entries"("actualTankTruckNumber", "isDeleted", "status");

-- A soft-deleted movement must not block a new physical movement.
DROP INDEX IF EXISTS "gate_entries_one_open_truck_key";
DROP INDEX IF EXISTS "gate_entries_one_open_crew_pass_key";
CREATE UNIQUE INDEX "gate_entries_one_open_truck_key"
  ON "gate_entries" (UPPER("actualTankTruckNumber"))
  WHERE "status" = 'IN' AND "isDeleted" = FALSE;
CREATE UNIQUE INDEX "gate_entries_one_open_crew_pass_key"
  ON "gate_entries" ("crewPassId")
  WHERE "status" = 'IN' AND "isDeleted" = FALSE;

-- Preserve old checklist rows. Only fields with a safe semantic mapping are copied.
ALTER TABLE "safety_checklists"
  ADD COLUMN "checklistVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "drivingLicenseValidCmvRule9" BOOLEAN,
  ADD COLUMN "verifyRegisterColumn1" BOOLEAN,
  ADD COLUMN "verifyRegisterColumn2" BOOLEAN,
  ADD COLUMN "rubberHoseCumLockCouplingGttMarked" BOOLEAN,
  ADD COLUMN "sparkArrestorCcoeApproved" BOOLEAN,
  ADD COLUMN "tremCardAndTrainingCardAvailable" BOOLEAN,
  ADD COLUMN "selfStarterWorking" BOOLEAN,
  ADD COLUMN "batteryTerminalRubberCovers" BOOLEAN,
  ADD COLUMN "noContainerCanExplosivesInCabin" BOOLEAN,
  ADD COLUMN "vmuWorking" BOOLEAN,
  ADD COLUMN "truckTyreConditionAcceptable" BOOLEAN;

UPDATE "safety_checklists"
SET
  "sparkArrestorCcoeApproved" = "sparkArrestorFitted",
  "truckTyreConditionAcceptable" = "tyresConditionOk";

ALTER TABLE "safety_checklists"
  ALTER COLUMN "ppeAvailable" DROP NOT NULL,
  ALTER COLUMN "checklistVersion" SET DEFAULT 2;

ALTER TABLE "safety_checklists"
  DROP COLUMN "fireExtinguishersAvailable",
  DROP COLUMN "sparkArrestorFitted",
  DROP COLUMN "emergencyShutOffWorking",
  DROP COLUMN "tyresConditionOk",
  DROP COLUMN "noLeakageObserved",
  DROP COLUMN "placardsDisplayed",
  DROP COLUMN "batteryCutOffWorking",
  DROP COLUMN "safetySealIntact";
