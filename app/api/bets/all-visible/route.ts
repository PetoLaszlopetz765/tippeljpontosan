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

    const userId = decoded.userId;

    const myBets = await prisma.bet.findMany({
      where: { userId },
      select: { eventId: true },
    });

    const myEventIds = Array.from(new Set(myBets.map((bet) => bet.eventId)));

    const bets = await prisma.bet.findMany({
      where: {
        OR: [
          { eventId: { in: myEventIds.length > 0 ? myEventIds : [-1] } },
          { event: { status: { in: ["CLOSED", "LEZÁRT"] } } },
        ],
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
