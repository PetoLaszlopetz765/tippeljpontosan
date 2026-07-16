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
      bets: Array<{ pointsAwarded: number; creditSpent: number }>;
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
              creditSpent: true,
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
              creditSpent: true,
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
      const baseTotalSpent = user.bets.reduce((sum, bet) => sum + (bet.creditSpent || 0), 0);

      return {
        id: user.id,
        username: user.username,
        credits: user.credits,
        role: user.role,
        points: user.points,
        tipsCount: Math.max(0, baseTipsCount + user.tipsCountAdjustment),
        perfectCount: Math.max(0, basePerfectCount + user.perfectCountAdjustment),
        totalSpent: baseTotalSpent,
        totalWinnings: winningsByUser.get(user.id) || 0,
      };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.credits !== a.credits) return b.credits - a.credits;
      if (b.perfectCount !== a.perfectCount) return b.perfectCount - a.perfectCount;
      return a.username.localeCompare(b.username);
    });

    const visibleLeaderboard = leaderboard.filter((user) => user.role !== "ADMIN");
    const rankByUserId = new Map<number, number>();
    visibleLeaderboard.forEach((user, index) => {
      rankByUserId.set(user.id, index + 1);
    });

    const leaderboardWithRank = leaderboard.map((user) => ({
      ...user,
      rank: user.role === "ADMIN" ? null : (rankByUserId.get(user.id) || null),
    }));

    return NextResponse.json(leaderboardWithRank);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}
