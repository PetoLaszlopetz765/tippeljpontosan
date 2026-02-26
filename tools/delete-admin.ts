import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.user.deleteMany({ where: { username: 'admin' } });
  console.log('Törölt admin felhasználók:', deleted.count);
}

main().finally(() => prisma.$disconnect());
