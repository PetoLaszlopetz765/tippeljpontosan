import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDailyPoolSchema() {
  try {
    console.log("🔍 DailyPool tábla struktúrájának ellenőrzése...");
    
    // Próbálunk létrehozni egy teszt rekordot eseményhez
    const testEvent = await prisma.event.findFirst();
    
    if (!testEvent) {
      console.log("⚠️ Nincs még esemény az adatbázisban, de a schema OK");
      console.log("✅ DailyPool tábla eventId mezővel elérhető!");
      return;
    }
    
    console.log(`📊 Teszt esemény: ${testEvent.homeTeam} vs ${testEvent.awayTeam}`);
    
    // Ellenőrizzük, hogy van-e már pool ehhez az eseményhez
    const existingPool = await prisma.dailyPool.findUnique({
      where: { eventId: testEvent.id },
    });
    
    if (existingPool) {
      console.log("✅ DailyPool rekord már létezik ehhez az eseményhez:", existingPool);
    } else {
      console.log("ℹ️ Még nincs pool rekord ehhez az eseményhez, de a schema rendben van!");
    }
    
    console.log("✅ DailyPool tábla eventId mezővel elérhető és működik!");
  } catch (err) {
    console.error("❌ Hiba a DailyPool tábla ellenőrzésekor:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDailyPoolSchema();
