import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [playersCount, adminsCount, playerCredits, betsAll, betsPlayers, byCost, pool] =
    await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.aggregate({ where: { role: { not: "ADMIN" } }, _sum: { credits: true } }),
      prisma.bet.aggregate({ _sum: { creditSpent: true }, _count: { _all: true } }),
      prisma.bet.aggregate({
        where: { user: { role: { not: "ADMIN" } } },
        _sum: { creditSpent: true },
        _count: { _all: true },
      }),
      prisma.bet.groupBy({
        by: ["creditSpent"],
        _count: { _all: true },
        orderBy: { creditSpent: "asc" },
      }),
      prisma.creditPool.findFirst({ orderBy: { id: "asc" } }),
    ]);

  const totalSpentAll = betsAll._sum.creditSpent || 0;
  const totalSpentPlayers = betsPlayers._sum.creditSpent || 0;

  const expectedChampionshipAll = Math.floor(totalSpentAll * 0.4);
  const expectedChampionshipPlayers = Math.floor(totalSpentPlayers * 0.4);

  const report = {
    playersCount,
    adminsCount,
    playerCreditsNow: playerCredits._sum.credits || 0,
    currentChampionshipPool: pool?.totalChampionship || 0,
    betCountAll: betsAll._count._all,
    betCountPlayers: betsPlayers._count._all,
    totalSpentAll,
    totalSpentPlayers,
    expectedChampionshipFromAllBets: expectedChampionshipAll,
    expectedChampionshipFromPlayersOnly: expectedChampionshipPlayers,
    deltaCurrentVsAllBets: (pool?.totalChampionship || 0) - expectedChampionshipAll,
    deltaCurrentVsPlayersOnly: (pool?.totalChampionship || 0) - expectedChampionshipPlayers,
    byCost,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error("Recalc error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
