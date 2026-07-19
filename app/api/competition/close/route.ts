import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

function compareUsers(a: any, b: any) {
  // Pont, telitalálat, 4p, 3p, kredit, név
  if (b.points !== a.points) return b.points - a.points;
  if (b.sixes !== a.sixes) return b.sixes - a.sixes;
  if (b.fours !== a.fours) return b.fours - a.fours;
  if (b.threes !== a.threes) return b.threes - a.threes;
  if (b.credits !== a.credits) return b.credits - a.credits;
  return a.username.localeCompare(b.username);
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token - csak adminok!" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin zárhatja le a versenyt!" }, { status: 403 });
    }

    // Get all users and their stats
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        credits: true,
        points: true,
        bets: {
          select: { pointsAwarded: true },
        },
      },
    });

    // Count 6p, 4p, 3p, 2p for tie-break
    const stats = users.map(u => {
      let sixes = 0, fours = 0, threes = 0, twos = 0;
      for (const b of u.bets) {
        if (b.pointsAwarded === 6) sixes++;
        else if (b.pointsAwarded === 4) fours++;
        else if (b.pointsAwarded === 3) threes++;
        else if (b.pointsAwarded === 2) twos++;
      }
      return { ...u, sixes, fours, threes, twos };
    });
    stats.sort(compareUsers);

    // Get championship pool
    const pool = await prisma.creditPool.findFirst();
    const total = pool?.totalChampionship || 0;
    if (total <= 0) {
      return NextResponse.json({ message: "Nincs kiosztható bajnoki pool!" }, { status: 400 });
    }
    // 1. hely: 50%, 2. hely: 30%, 3. hely: 20%
    const first = Math.floor(total * 0.5);
    const second = Math.floor(total * 0.3);
    const third = total - first - second;
    const winners = stats.slice(0, 3);

    // Ne legyen -kredit: csak pozitív vagy 0 lehet
    const updates = [];
    if (winners[0]) updates.push(prisma.user.update({ where: { id: winners[0].id }, data: { credits: { increment: first } } }));
    if (winners[1]) updates.push(prisma.user.update({ where: { id: winners[1].id }, data: { credits: { increment: second } } }));
    if (winners[2]) updates.push(prisma.user.update({ where: { id: winners[2].id }, data: { credits: { increment: third } } }));
    await Promise.all(updates);
    if (pool) {
      await prisma.creditPool.update({ where: { id: pool.id }, data: { totalChampionship: 0 } });
    }

    return NextResponse.json({
      message: `Nyeremények kiosztva! 1. hely: ${winners[0]?.username} (+${first}), 2. hely: ${winners[1]?.username} (+${second}), 3. hely: ${winners[2]?.username} (+${third})`,
      winners: winners.map((w, i) => ({ username: w.username, place: i + 1 })),
    });
  } catch (err) {
    return NextResponse.json({ message: `Hiba: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
