import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

interface BetWithPoints {
  userId: number;
  pointsAwarded: number;
}

interface UserRanking {
  id: number;
  username: string;
  points: number;
  credits: number;
  perfectMatches: number; // telitalálatok száma
  fourPointMatches: number; // 4 pontos találatok
  threePointMatches: number; // 3 pontos találatok
  twoPointMatches: number; // 2 pontos találatok
}

// Holtverseny feloldása: több telitalálat, majd 4 pontos, majd 3 pontos találat, majd több kredit
function compareUsers(a: UserRanking, b: UserRanking): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.perfectMatches !== a.perfectMatches) return b.perfectMatches - a.perfectMatches;
  if (b.fourPointMatches !== a.fourPointMatches) return b.fourPointMatches - a.fourPointMatches;
  if (b.threePointMatches !== a.threePointMatches) return b.threePointMatches - a.threePointMatches;
  if (b.credits !== a.credits) return b.credits - a.credits;
  return a.username.localeCompare(b.username);
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== CHAMPIONSHIP CLOSE ENDPOINT CALLED ===");

    // Admin ellenőrzés
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak versenyt lezárni" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "admin") {
        return NextResponse.json(
          { message: "Csak adminok tudnak versenyt lezárni" },
          { status: 403 }
        );
      }
    } catch (err) {
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    // Bajnokság pool lekérése
    const championshipPool = await prisma.creditPool.findUnique({
      where: { id: 1 },
    });

    if (!championshipPool) {
      return NextResponse.json(
        { message: "Nincs bajnokság pool" },
        { status: 404 }
      );
    }

    const totalPrize = championshipPool.totalChampionship;
    console.log(`💰 Championship pool: ${totalPrize} kredit`);

    // Összes felhasználó és pontjaik lekérése
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        points: true,
        credits: true,
      },
    });

    // Minden felhasználóhoz a pontok száma és bomlása
    const userRankings: UserRanking[] = [];

    for (const user of allUsers) {
      const userBets = await prisma.bet.findMany({
        where: { userId: user.id },
      });

      const ranking: UserRanking = {
        id: user.id,
        username: user.username,
        points: user.points,
        credits: user.credits,
        perfectMatches: userBets.filter((b) => b.pointsAwarded === 6).length,
        fourPointMatches: userBets.filter((b) => b.pointsAwarded === 4).length,
        threePointMatches: userBets.filter((b) => b.pointsAwarded === 3).length,
        twoPointMatches: userBets.filter((b) => b.pointsAwarded === 2).length,
      };

      userRankings.push(ranking);
    }

    // Rendezés a holtverseny szabályok szerint
    userRankings.sort(compareUsers);

    console.log("🏆 Final Ranking:");
    userRankings.slice(0, 3).forEach((user, idx) => {
      console.log(
        `${idx + 1}. ${user.username} (${user.points} pont, ${user.perfectMatches} telitalálat)`
      );
    });

    // Top 3 díja
    const prizes = [
      { place: 1, percentage: 0.5, userId: userRankings[0]?.id },
      { place: 2, percentage: 0.3, userId: userRankings[1]?.id },
      { place: 3, percentage: 0.2, userId: userRankings[2]?.id },
    ];

    let distributedAmount = 0;
    const prizeWinners = [];

    for (const prize of prizes) {
      if (!prize.userId) {
        console.log(`⚠️ ${prize.place}. hely: nincs játékos`);
        continue;
      }

      const prizeAmount = Math.floor(totalPrize * prize.percentage);
      const user = allUsers.find((u) => u.id === prize.userId);

      if (!user) continue;

      // Ellenőrzés: nem mehet -kredit alá
      const finalCredits = user.credits + prizeAmount;
      if (finalCredits < 0) {
        console.log(
          `❌ ${prize.place}. hely (${user.username}): nem lehet -kredite! (${user.credits} + ${prizeAmount} = ${finalCredits})`
        );
        continue;
      }

      // Kredit hozzáadása
      await prisma.user.update({
        where: { id: prize.userId },
        data: {
          credits: {
            increment: prizeAmount,
          },
        },
      });

      console.log(`✓ ${prize.place}. hely ${user.username}: +${prizeAmount} kredit`);
      distributedAmount += prizeAmount;
      prizeWinners.push({
        place: prize.place,
        username: user.username,
        amount: prizeAmount,
      });
    }

    // Championship pool kinullázása (az elosztott kreditek kivonása)
    await prisma.creditPool.update({
      where: { id: 1 },
      data: {
        totalChampionship: totalPrize - distributedAmount,
      },
    });

    console.log(`✓ Championship closed! Distributed: ${distributedAmount} kredit`);

    return NextResponse.json({
      message: `Bajnokság lezárva! ${distributedAmount} kredit szétosztva.`,
      winners: prizeWinners,
      totalPool: totalPrize,
      distributedAmount,
      remaining: totalPrize - distributedAmount,
    });
  } catch (err) {
    console.error("❌ Championship close error:", err);
    return NextResponse.json(
      { message: `Hiba a verseny lezárásánál: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
