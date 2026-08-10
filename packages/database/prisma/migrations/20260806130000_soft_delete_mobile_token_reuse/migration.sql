-- Soft-deleted mistakes must not permanently reserve a mobile token for the day.
-- Keep uniqueness for every active (non-deleted) record.
ALTER TABLE "gate_entries"
  DROP CONSTRAINT IF EXISTS "gate_entries_business_date_mobile_token_key";

CREATE UNIQUE INDEX "gate_entries_active_business_date_mobile_token_key"
  ON "gate_entries"("businessDate", "mobileTokenNumber")
  WHERE "isDeleted" = FALSE;

CREATE INDEX "gate_entries_businessDate_mobileTokenNumber_isDeleted_idx"
  ON "gate_entries"("businessDate", "mobileTokenNumber", "isDeleted");
