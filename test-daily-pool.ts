import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDailyPool() {
  try {
    console.log("🔍 DailyPool tábla elérhetőségének ellenőrzése...");
    const result = await prisma.dailyPool.findMany();
    console.log("✅ DailyPool tábla elérhető!");
    console.log(`📊 Jelenlegi rekordok száma: ${result.length}`);
    console.log("Adatok:", result);
  } catch (err) {
    console.error("❌ Hiba a DailyPool tábla elérésekor:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDailyPool();
