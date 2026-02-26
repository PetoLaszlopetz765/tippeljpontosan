import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (existing) {
    console.log('Admin már létezik:', existing.username);
    return;
  }

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('Hiányzik az ADMIN_PASSWORD környezeti változó.');
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashed,
      role: 'ADMIN',
      credits: 10000,
      points: 0,
    },
  });

  console.log('Admin létrehozva:', admin.username);
}

main().finally(() => prisma.$disconnect());
