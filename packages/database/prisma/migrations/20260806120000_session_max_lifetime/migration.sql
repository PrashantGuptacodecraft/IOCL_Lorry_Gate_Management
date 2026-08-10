-- Enforce a fixed maximum session lifetime in addition to rotating refresh-token expiry.
ALTER TABLE "refresh_tokens" ADD COLUMN "sessionExpiresAt" TIMESTAMPTZ;

-- Existing sessions are capped at the documented default eight-hour shift lifetime.
UPDATE "refresh_tokens"
SET "sessionExpiresAt" = "createdAt" + INTERVAL '8 hours';

UPDATE "refresh_tokens"
SET "expiresAt" = LEAST("expiresAt", "sessionExpiresAt");

ALTER TABLE "refresh_tokens" ALTER COLUMN "sessionExpiresAt" SET NOT NULL;
ALTER TABLE "refresh_tokens"
  ADD CONSTRAINT "refresh_tokens_expiry_within_session_check"
  CHECK ("expiresAt" <= "sessionExpiresAt");
CREATE INDEX "refresh_tokens_sessionId_sessionExpiresAt_idx"
  ON "refresh_tokens"("sessionId", "sessionExpiresAt");
