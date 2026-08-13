-- Migration: Replace global invoiceNumber unique index with a per-business-date partial unique index.
-- This allows the same invoice number to be reused on different business dates (different trips),
-- while still preventing two exits on the SAME day from using the same invoice number.

-- Step 1: Drop the old global unique index
DROP INDEX IF EXISTS "gate_entries_invoiceNumber_key";

-- Step 2: Create a smarter partial unique index:
--   - Only among non-null invoice numbers
--   - Only among non-deleted entries
--   - Unique per (business_date, invoice_number) — NOT globally
CREATE UNIQUE INDEX IF NOT EXISTS "gate_entries_invoice_per_day_key"
  ON "gate_entries" ("businessDate", "invoiceNumber")
  WHERE "invoiceNumber" IS NOT NULL AND "isDeleted" = false;
