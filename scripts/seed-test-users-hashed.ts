import { prisma } from "../lib/db";
import bcrypt from "bcrypt";

async function main() {
  // Törlés
  await prisma.bet.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Jelszavak hash-elése
  const adminPassword = await bcrypt.hash("ToleDo1975", 10);
  const userPassword = await bcrypt.hash("pw", 10);

  // Felhasználók létrehozása (admin + 5 user)
  const admin = await prisma.user.create({ data: { username: "admin", password: adminPassword, role: "ADMIN" } });
  const users = await Promise.all([
    prisma.user.create({ data: { username: "user1", password: userPassword, role: "USER" } }),
    prisma.user.create({ data: { username: "user2", password: userPassword, role: "USER" } }),
    prisma.user.create({ data: { username: "user3", password: userPassword, role: "USER" } }),
    prisma.user.create({ data: { username: "user4", password: userPassword, role: "USER" } }),
    prisma.user.create({ data: { username: "user5", password: userPassword, role: "USER" } }),
  ]);

  // 4 meccs létrehozása
  const now = new Date();
  const events = await Promise.all([
    prisma.event.create({ data: { homeTeam: "TeamA", awayTeam: "TeamB", kickoffTime: new Date(now.getTime() + 3600 * 1000 * 24 * 1), status: "OPEN", creditCost: 100 } }),
    prisma.event.create({ data: { homeTeam: "TeamC", awayTeam: "TeamD", kickoffTime: new Date(now.getTime() + 3600 * 1000 * 24 * 2), status: "OPEN", creditCost: 100 } }),
    prisma.event.create({ data: { homeTeam: "TeamE", awayTeam: "TeamF", kickoffTime: new Date(now.getTime() + 3600 * 1000 * 24 * 3), status: "OPEN", creditCost: 100 } }),
    prisma.event.create({ data: { homeTeam: "TeamG", awayTeam: "TeamH", kickoffTime: new Date(now.getTime() + 3600 * 1000 * 24 * 4), status: "OPEN", creditCost: 100 } }),
  ]);

  // user1-user4 minden meccsre tippel, user5 csak az első kettőre
  for (let u = 0; u < 4; u++) {
    for (let e = 0; e < 4; e++) {
      await prisma.bet.create({
        data: {
          userId: users[u].id,
          eventId: events[e].id,
          predictedHomeGoals: 1 + u,
          predictedAwayGoals: 2 + e,
          pointsAwarded: 0,
          creditSpent: 100,
        },
      });
    }
  }
  // user5 csak 2 meccsre tippel
  for (let e = 0; e < 2; e++) {
    await prisma.bet.create({
      data: {
        userId: users[4].id,
        eventId: events[e].id,
        predictedHomeGoals: 0,
        predictedAwayGoals: 0,
        pointsAwarded: 0,
        creditSpent: 100,
      },
    });
  }

  console.log("Seed kész!");
}

main().finally(() => prisma.$disconnect());
