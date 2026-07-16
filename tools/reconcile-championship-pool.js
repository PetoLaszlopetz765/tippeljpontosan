import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const shouldApply = process.argv.includes("--apply");

async function main() {
  const [userAgg, betAgg, byCost] = await Promise.all([
    prisma.user.aggregate({
      where: { role: { not: "ADMIN" } },
      _count: { _all: true },
    }),
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
  ]);

  const playerCount = userAgg._count._all || 0;
  const totalSpent = betAgg._sum.creditSpent || 0;
  const targetChampionshipPool = Math.floor(totalSpent * 0.4);

  const currentPool = await prisma.creditPool.findFirst({ orderBy: { id: "asc" } });

  const updatedPool = shouldApply
    ? currentPool
      ? await prisma.creditPool.update({
          where: { id: currentPool.id },
          data: { totalChampionship: targetChampionshipPool },
        })
      : await prisma.creditPool.create({
          data: { totalDaily: 0, totalChampionship: targetChampionshipPool },
        })
    : {
        totalChampionship: targetChampionshipPool,
      };

  console.log(
    JSON.stringify(
      {
        playerCount,
        totalBetsCount: betAgg._count._all,
        totalSpent,
        byCost,
        mode: shouldApply ? "apply" : "dry-run",
        previousChampionshipPool: currentPool?.totalChampionship || 0,
        newChampionshipPool: updatedPool.totalChampionship,
        delta: updatedPool.totalChampionship - (currentPool?.totalChampionship || 0),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
