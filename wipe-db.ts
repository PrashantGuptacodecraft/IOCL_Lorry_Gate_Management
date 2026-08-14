import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping all GateEntry, SafetyChecklist, AuditLog, and DailyCounter data...');
  
  // Wipe all related records
  await prisma.safetyChecklist.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.gateEntry.deleteMany({});
  await prisma.dailyCounter.deleteMany({});
  
  console.log('Data wipe complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
