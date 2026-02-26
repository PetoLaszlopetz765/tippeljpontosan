import { prisma } from '@/lib/db';

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { kickoffTime: 'asc' },
    include: { dailyPool: true },
  });

  console.log('Események pool carryover diagnosztika:');
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.dailyPool) {
      console.log(`#${event.id} - Nincs dailyPool`);
      continue;
    }

    const prev = i > 0 ? events[i - 1] : null;
    const prevPool = prev?.dailyPool;
    let expectedCarry = 0;

    if (prevPool && prevPool.totalDistributed === 0) {
      expectedCarry = prevPool.totalDaily + prevPool.carriedFromPrevious;
    }

    const ok = event.dailyPool.carriedFromPrevious === expectedCarry;
    console.log(
      `Esemény #${event.id} | Pool: ${event.dailyPool.totalDaily} | Carry: ${event.dailyPool.carriedFromPrevious} | totalDistributed: ${event.dailyPool.totalDistributed} | Elvárt carry: ${expectedCarry} | ${ok ? 'OK' : 'HIBA!'}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Hiba a diagnosztika során:', err);
});
