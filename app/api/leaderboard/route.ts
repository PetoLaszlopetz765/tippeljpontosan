import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // Összes felhasználó lekérdezése
    // A pont forrása a User.points mező (admin által is szerkeszthető)
    const users = await prisma.user.findMany({
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
