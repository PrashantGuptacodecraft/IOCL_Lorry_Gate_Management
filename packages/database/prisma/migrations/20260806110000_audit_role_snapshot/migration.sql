-- Preserve the actor's role at the time of every audited action.
-- The related user's current role can change later and is therefore not a reliable historical value.
ALTER TABLE "audit_logs" ADD COLUMN "actorRole" "UserRole";

UPDATE "audit_logs" AS audit
SET "actorRole" = actor."role"
FROM "users" AS actor
WHERE actor."id" = audit."actorId";

ALTER TABLE "audit_logs" ALTER COLUMN "actorRole" SET NOT NULL;
CREATE INDEX "audit_logs_actorRole_createdAt_idx" ON "audit_logs"("actorRole", "createdAt");
