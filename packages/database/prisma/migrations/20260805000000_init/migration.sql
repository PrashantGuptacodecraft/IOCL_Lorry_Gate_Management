CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('ENTRY_GATE_SECURITY', 'EXIT_GATE_SECURITY', 'SUPERVISOR', 'ADMIN');
CREATE TYPE "CrewType" AS ENUM ('DRIVER', 'DRIVER_WITH_HELPER', 'CONTRACT_CREW');
CREATE TYPE "EntryStatus" AS ENUM ('IN', 'OUT', 'CANCELLED');
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGIN_FAILED', 'TOKEN_REFRESH', 'LOGOUT', 'CREATE', 'UPDATE', 'EXIT', 'CANCEL');
CREATE TYPE "QrScanMethod" AS ENUM ('CAMERA', 'HARDWARE_SCANNER', 'MANUAL', 'DEMO');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeCode" VARCHAR(32) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMPTZ,
  "authVersion" INTEGER NOT NULL DEFAULT 1,
  "lastLoginAt" TIMESTAMPTZ,
  "lastPasswordChangedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_failed_login_attempts_check" CHECK ("failedLoginAttempts" >= 0),
  CONSTRAINT "users_auth_version_check" CHECK ("authVersion" > 0)
);
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

CREATE TABLE "refresh_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tokenHash" VARCHAR(128) NOT NULL UNIQUE,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sessionId" UUID NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "revokedAt" TIMESTAMPTZ,
  "revokeReason" VARCHAR(40),
  "lastUsedAt" TIMESTAMPTZ,
  "ipAddress" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "refresh_tokens_userId_expiresAt_idx" ON "refresh_tokens"("userId", "expiresAt");
CREATE INDEX "refresh_tokens_sessionId_revokedAt_idx" ON "refresh_tokens"("sessionId", "revokedAt");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_auth_version_check" CHECK ("authVersion" > 0);

CREATE TABLE "security_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventType" VARCHAR(50) NOT NULL,
  "employeeCode" VARCHAR(32),
  "actorId" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "ipAddress" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "requestId" VARCHAR(64),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "security_events_eventType_createdAt_idx" ON "security_events"("eventType", "createdAt");
CREATE INDEX "security_events_employeeCode_createdAt_idx" ON "security_events"("employeeCode", "createdAt");

CREATE TABLE "crew_passes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "qrToken" VARCHAR(500) NOT NULL UNIQUE,
  "crewId" VARCHAR(50) NOT NULL UNIQUE,
  "driverName" VARCHAR(120) NOT NULL,
  "crewType" "CrewType" NOT NULL,
  "passValidUntil" DATE NOT NULL,
  "ttNumberOnPass" VARCHAR(20) NOT NULL,
  "drivingLicenseNumber" VARCHAR(40) NOT NULL,
  "drivingLicenseExpiryDate" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "sourceSystem" VARCHAR(60) NOT NULL DEFAULT 'DEMO_MASTER',
  "sourcePayload" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "crew_passes_ttNumberOnPass_idx" ON "crew_passes"("ttNumberOnPass");
CREATE INDEX "crew_passes_passValidUntil_isActive_idx" ON "crew_passes"("passValidUntil", "isActive");

CREATE TABLE "customer_destinations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL UNIQUE,
  "name" VARCHAR(160) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "customer_destinations_isActive_displayOrder_idx" ON "customer_destinations"("isActive", "displayOrder");

CREATE TABLE "daily_counters" (
  "businessDate" DATE PRIMARY KEY,
  "lastSerial" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "daily_counters_last_serial_check" CHECK ("lastSerial" >= 0)
);

CREATE TABLE "gate_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "recordVersion" INTEGER NOT NULL DEFAULT 1,
  "facilityCode" VARCHAR(30) NOT NULL,
  "gateCode" VARCHAR(30) NOT NULL,
  "serialNumber" INTEGER NOT NULL,
  "businessDate" DATE NOT NULL,
  "entryDate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "timeIn" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "timeOut" TIMESTAMPTZ,
  "status" "EntryStatus" NOT NULL DEFAULT 'IN',
  "qrScanMethod" "QrScanMethod" NOT NULL DEFAULT 'CAMERA',
  "crewPassId" UUID NOT NULL REFERENCES "crew_passes"("id") ON DELETE RESTRICT,
  "crewId" VARCHAR(50) NOT NULL,
  "driverName" VARCHAR(120) NOT NULL,
  "crewType" "CrewType" NOT NULL,
  "passValidUntil" DATE NOT NULL,
  "ttNumberOnPass" VARCHAR(20) NOT NULL,
  "drivingLicenseNumber" VARCHAR(40) NOT NULL,
  "drivingLicenseExpiryDate" DATE NOT NULL,
  "customerDestination" VARCHAR(160) NOT NULL,
  "actualTankTruckNumber" VARCHAR(20) NOT NULL,
  "abs" BOOLEAN NOT NULL,
  "challanNumber" VARCHAR(50) NOT NULL,
  "driverPassNumber" VARCHAR(50) NOT NULL,
  "helperName" VARCHAR(100),
  "helperPassNumber" VARCHAR(50),
  "mobileTokenNumber" VARCHAR(40) NOT NULL,
  "remarks" VARCHAR(500),
  "ttNumberMatch" BOOLEAN NOT NULL,
  "createdById" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "updatedById" UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gate_entries_business_date_serial_key" UNIQUE ("businessDate", "serialNumber"),
  CONSTRAINT "gate_entries_business_date_mobile_token_key" UNIQUE ("businessDate", "mobileTokenNumber"),
  CONSTRAINT "gate_entries_id_version_key" UNIQUE ("id", "recordVersion"),
  CONSTRAINT "gate_entries_serial_number_check" CHECK ("serialNumber" > 0),
  CONSTRAINT "gate_entries_record_version_check" CHECK ("recordVersion" > 0),
  CONSTRAINT "gate_entries_out_time_check" CHECK (
    ("status" = 'OUT' AND "timeOut" IS NOT NULL) OR
    ("status" <> 'OUT')
  )
);
CREATE INDEX "gate_entries_businessDate_status_timeIn_idx" ON "gate_entries"("businessDate", "status", "timeIn");
CREATE INDEX "gate_entries_actualTankTruckNumber_status_idx" ON "gate_entries"("actualTankTruckNumber", "status");
CREATE INDEX "gate_entries_driverName_idx" ON "gate_entries"("driverName");
CREATE INDEX "gate_entries_crewId_idx" ON "gate_entries"("crewId");

-- Database-level invariants for currently-open movements.
CREATE UNIQUE INDEX "gate_entries_one_open_truck_key"
  ON "gate_entries" (UPPER("actualTankTruckNumber"))
  WHERE "status" = 'IN';

CREATE UNIQUE INDEX "gate_entries_one_open_crew_pass_key"
  ON "gate_entries" ("crewPassId")
  WHERE "status" = 'IN';

CREATE TABLE "safety_checklists" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gateEntryId" UUID NOT NULL UNIQUE REFERENCES "gate_entries"("id") ON DELETE CASCADE,
  "fireExtinguishersAvailable" BOOLEAN NOT NULL,
  "sparkArrestorFitted" BOOLEAN NOT NULL,
  "emergencyShutOffWorking" BOOLEAN NOT NULL,
  "tyresConditionOk" BOOLEAN NOT NULL,
  "noLeakageObserved" BOOLEAN NOT NULL,
  "placardsDisplayed" BOOLEAN NOT NULL,
  "ppeAvailable" BOOLEAN NOT NULL,
  "batteryCutOffWorking" BOOLEAN NOT NULL,
  "safetySealIntact" BOOLEAN NOT NULL,
  "inspectionArea" VARCHAR(100) NOT NULL,
  "sealNumber" VARCHAR(80) NOT NULL,
  "verifiedBy" VARCHAR(100) NOT NULL,
  "verificationNotes" VARCHAR(500) NOT NULL,
  "exceptionRemarks" VARCHAR(500),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" VARCHAR(80),
  "action" "AuditAction" NOT NULL,
  "changedFields" JSONB,
  "beforeData" JSONB,
  "afterData" JSONB,
  "ipAddress" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "requestId" VARCHAR(64),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx" ON "audit_logs"("entityType", "entityId", "createdAt");
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
