import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // User azonosítása tokenből
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs bejelentkezve" }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }
    const userId = decoded.userId;

    // Lekérjük, hogy a user mely eseményekre tippelt
    const userBets = await prisma.bet.findMany({
      where: { userId },
      select: { eventId: true },
    });
    const eventIds = userBets.map(b => b.eventId);
    if (eventIds.length === 0) {
      return NextResponse.json([]); // Még semmire sem tippelt
    }

    // Csak azokat az eseményeket adjuk vissza, amelyekre a user is tippelt
    const bets = await prisma.bet.findMany({
      where: { eventId: { in: eventIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            points: true,
          },
        },
        event: true,
      },
      orderBy: [
        { event: { kickoffTime: "desc" } },
        { user: { username: "asc" } },
      ],
    });

    return NextResponse.json(bets);
  } catch (err) {
    console.error("All bets error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}
