// scripts/diagnose-pool-carryover.ts
// Diagnosztikai script: napi pool carryover és totalDistributed ellenőrzése
// Nem módosítja az adatbázist, csak kiírja az állapotokat!

import { prisma } from "@/lib/db";

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { kickoffTime: "asc" },
    include: { dailyPool: true },
  });

  console.log("Események pool carryover diagnosztika:");
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.dailyPool) {
      console.log(`#${e.id} - Nincs dailyPool`);
      continue;
    }
    const prev = i > 0 ? events[i - 1] : null;
    const prevPool = prev?.dailyPool;
    let expectedCarry = 0;
    if (prevPool && prevPool.totalDistributed === 0) {
      expectedCarry = prevPool.totalDaily + prevPool.carriedFromPrevious;
    }
    const ok = e.dailyPool.carriedFromPrevious === expectedCarry;
    console.log(
      `Esemény #${e.id} | Pool: ${e.dailyPool.totalDaily} | Carry: ${e.dailyPool.carriedFromPrevious} | totalDistributed: ${e.dailyPool.totalDistributed} | Elvárt carry: ${expectedCarry} | ${ok ? "OK" : "HIBA!"}`
    );
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Hiba a diagnosztika során:", err);
});
