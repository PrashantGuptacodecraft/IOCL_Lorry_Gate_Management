import { Prisma, PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const employeeCode = required("PROVISION_EMPLOYEE_CODE").toUpperCase();
  const name = required("PROVISION_NAME");
  const password = required("PROVISION_PASSWORD");
  const roleValue = required("PROVISION_ROLE");

  if (!/^[A-Z0-9._-]{4,32}$/.test(employeeCode)) throw new Error("PROVISION_EMPLOYEE_CODE is invalid");
  if (name.length < 2 || name.length > 100) throw new Error("PROVISION_NAME must be 2–100 characters");
  if (password.length < 12 || password.length > 128) throw new Error("PROVISION_PASSWORD must be 12–128 characters");
  if (!Object.values(UserRole).includes(roleValue as UserRole)) {
    throw new Error(`PROVISION_ROLE must be one of: ${Object.values(UserRole).join(", ")}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const result = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.user.findUnique({ where: { employeeCode }, select: { id: true } });
      if (!existing) {
        const user = await tx.user.create({
          data: { employeeCode, name, role: roleValue as UserRole, passwordHash },
          select: { id: true, employeeCode: true, name: true, role: true, isActive: true },
        });
        return { user, revokedSessions: 0 };
      }

      const revoked = await tx.refreshToken.updateMany({
        where: { userId: existing.id, revokedAt: null },
        data: { revokedAt: now, revokeReason: "PASSWORD_OR_ROLE_CHANGED" },
      });
      const user = await tx.user.update({
        where: { id: existing.id },
        data: {
          name,
          role: roleValue as UserRole,
          passwordHash,
          isActive: true,
          failedLoginAttempts: 0,
          lockedUntil: null,
          authVersion: { increment: 1 },
          lastPasswordChangedAt: now,
        },
        select: { id: true, employeeCode: true, name: true, role: true, isActive: true },
      });
      return { user, revokedSessions: revoked.count };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log(JSON.stringify({ success: true, ...result }, null, 2));
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
