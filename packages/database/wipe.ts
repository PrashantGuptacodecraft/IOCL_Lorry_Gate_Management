import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeRecords() {
  console.log("🔴 Starting database wipe — gate data only, users preserved...\n");

  // Delete in FK-safe order: children first, then parents
  const auditLogs    = await prisma.auditLog.deleteMany();
  const safetyChk    = await prisma.safetyChecklist.deleteMany();
  const gateEntries  = await prisma.gateEntry.deleteMany();
  const dailyCounter = await prisma.dailyCounter.deleteMany();
  const crewPasses   = await prisma.crewPass.deleteMany();
  const secEvents    = await prisma.securityEvent.deleteMany();
  const refreshToks  = await prisma.refreshToken.deleteMany();

  console.log(`✅ AuditLog        → ${auditLogs.count} rows deleted`);
  console.log(`✅ SafetyChecklist → ${safetyChk.count} rows deleted`);
  console.log(`✅ GateEntry       → ${gateEntries.count} rows deleted`);
  console.log(`✅ DailyCounter    → ${dailyCounter.count} rows deleted`);
  console.log(`✅ CrewPass        → ${crewPasses.count} rows deleted`);
  console.log(`✅ SecurityEvent   → ${secEvents.count} rows deleted`);
  console.log(`✅ RefreshToken    → ${refreshToks.count} rows deleted`);
  console.log("\n✅ Done — database is fresh. User accounts & customer destinations kept.");
}

wipeRecords()
  .catch((e) => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
