import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Létrehozunk néhány meghívó kódot
  const inviteCodes = ["TEST123", "INVITE456", "CODE789"];
  
  for (const code of inviteCodes) {
    await prisma.inviteCode.upsert({
      where: { code },
      update: {},
      create: { code, used: false },
    });
  }
  
  console.log("✅ Meghívó kódok létrehozva:", inviteCodes);
  
  // 4 teszt felhasználó + 1 admin
  const users = [
    { username: "testuser1", password: "password123", role: "USER" },
    { username: "testuser2", password: "password123", role: "USER" },
    { username: "testuser3", password: "password123", role: "USER" },
    { username: "testuser4", password: "password123", role: "USER" },
    { username: "admin", password: "TolEdo1975", role: "ADMIN" },
  ];
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const created = await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: hashedPassword,
        role: user.role,
        points: 0,
      },
    });
    console.log(`✅ Felhasználó: ${created.username} (${user.role})`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Hiba:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
