import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs bejelentkezve" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const bets = await prisma.bet.findMany({
      where: {
        user: {
          username: {
            not: "admin",
          },
        },
      },
      select: {
        id: true,
        userId: true,
        eventId: true,
        predictedHomeGoals: true,
        predictedAwayGoals: true,
        pointsAwarded: true,
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [
        { event: { kickoffTime: "asc" } },
        { user: { username: "asc" } },
      ],
    });

    return NextResponse.json({ bets });
  } catch (err) {
    console.error("All visible bets error:", err);
    return NextResponse.json({ message: "Hiba történt" }, { status: 500 });
  }
}
