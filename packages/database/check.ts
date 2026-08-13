import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUser() {
  const users = await prisma.user.findMany({
    select: { employeeCode: true, isActive: true, lockedUntil: true, failedLoginAttempts: true }
  });
  console.log(users);
}

checkUser().finally(() => prisma.$disconnect());
