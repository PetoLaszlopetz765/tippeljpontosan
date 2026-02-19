// scripts/fix-pool-carryover.ts
// Migrációs script: helyreállítja a carriedFromPrevious értékeket minden eseményre visszamenőleg
// Nem módosít mást, csak a DailyPool carriedFromPrevious mezőjét!

import { prisma } from "@/lib/db";

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { kickoffTime: "asc" },
    include: { dailyPool: true },
  });

  let prevPool = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.dailyPool) {
      prevPool = null;
      continue;
    }
    let expectedCarry = 0;
    if (prevPool) {
      expectedCarry = prevPool.totalDaily + prevPool.carriedFromPrevious;
    }
    if (e.dailyPool.carriedFromPrevious !== expectedCarry) {
      await prisma.dailyPool.update({
        where: { eventId: e.id },
        data: { carriedFromPrevious: expectedCarry },
      });
      console.log(`#${e.id} carriedFromPrevious javítva: ${e.dailyPool.carriedFromPrevious} → ${expectedCarry}`);
    }
    prevPool = e.dailyPool;
  }
  await prisma.$disconnect();
  console.log("Kész: minden carriedFromPrevious helyreállítva.");
}

main().catch((err) => {
  console.error("Hiba a migráció során:", err);
});
