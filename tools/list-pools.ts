import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pools = await prisma.creditPool.findMany();
  console.log(pools);
}

main().finally(() => prisma.$disconnect());
