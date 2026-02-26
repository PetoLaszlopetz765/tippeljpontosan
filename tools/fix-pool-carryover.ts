import { prisma } from '@/lib/db';

async function main() {
  const events = await prisma.event.findMany({
    orderBy: { kickoffTime: 'asc' },
    include: { dailyPool: true },
  });

  let previousPool: (typeof events)[number]['dailyPool'] | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.dailyPool) {
      previousPool = null;
      continue;
    }

    let expectedCarry = 0;
    if (previousPool && previousPool.totalDistributed === 0) {
      expectedCarry = previousPool.totalDaily + previousPool.carriedFromPrevious;
    }

    if (event.dailyPool.carriedFromPrevious !== expectedCarry) {
      await prisma.dailyPool.update({
        where: { eventId: event.id },
        data: { carriedFromPrevious: expectedCarry },
      });

      console.log(
        `#${event.id} carriedFromPrevious javítva: ${event.dailyPool.carriedFromPrevious} → ${expectedCarry}`,
      );
    }

    previousPool = event.dailyPool;
  }

  await prisma.$disconnect();
  console.log('Kész: minden carriedFromPrevious helyreállítva.');
}

main().catch((err) => {
  console.error('Hiba a migráció során:', err);
});
