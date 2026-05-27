import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const withCode = err as { code?: string; message?: string };
  return withCode.code === "P2022" || (withCode.message ?? "").toLowerCase().includes("column");
}

export async function GET(req: NextRequest) {
  try {
    // Összes felhasználó lekérdezése
    // A pont forrása a User.points mező (admin által is szerkeszthető)
    let users: Array<{
      id: number;
      username: string;
      points: number;
      credits: number;
      role: string;
      tipsCountAdjustment: number;
      perfectCountAdjustment: number;
      bets: Array<{ pointsAwarded: number }>;
    }>;

    try {
      users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          points: true,
          credits: true,
          role: true,
          tipsCountAdjustment: true,
          perfectCountAdjustment: true,
          bets: {
            select: {
              pointsAwarded: true,
            },
          },
        },
      });
    } catch (queryErr) {
      if (!isMissingColumnError(queryErr)) {
        throw queryErr;
      }

      const legacyUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          points: true,
          credits: true,
          role: true,
          bets: {
            select: {
              pointsAwarded: true,
            },
          },
        },
      });

      users = legacyUsers.map((user) => ({
        ...user,
        tipsCountAdjustment: 0,
        perfectCountAdjustment: 0,
      }));
    }

    const distributedEvents = await prisma.event.findMany({
      where: {
        dailyPool: {
          is: {
            totalDistributed: {
              gt: 0,
            },
          },
        },
      },
      select: {
        dailyPool: {
          select: {
            totalDistributed: true,
          },
        },
        bets: {
          select: {
            userId: true,
            pointsAwarded: true,
          },
        },
      },
    });

    const winningsByUser = new Map<number, number>();
    for (const event of distributedEvents) {
      const totalDistributed = event.dailyPool?.totalDistributed || 0;
      if (totalDistributed <= 0) continue;

      const perfectBets = event.bets.filter((bet) => bet.pointsAwarded === 6);
      if (perfectBets.length === 0) continue;

      const winPerUser = Math.floor(totalDistributed / perfectBets.length);
      if (winPerUser <= 0) continue;

      for (const bet of perfectBets) {
        winningsByUser.set(bet.userId, (winningsByUser.get(bet.userId) || 0) + winPerUser);
      }
    }

    // Tipp statisztikák bets-ből, pont pedig User.points-ból
    const leaderboard = users.map((user) => {
      const baseTipsCount = user.bets.length;
      const basePerfectCount = user.bets.filter((bet) => bet.pointsAwarded === 6).length;

      return {
        id: user.id,
        username: user.username,
        credits: user.credits,
        role: user.role,
        points: user.points,
        tipsCount: Math.max(0, baseTipsCount + user.tipsCountAdjustment),
        perfectCount: Math.max(0, basePerfectCount + user.perfectCountAdjustment),
        totalWinnings: winningsByUser.get(user.id) || 0,
      };
    }).sort((a, b) => b.points - a.points);

    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}
