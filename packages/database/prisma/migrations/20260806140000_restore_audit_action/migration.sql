-- Audit recoveries of soft-deleted register records.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESTORE';
