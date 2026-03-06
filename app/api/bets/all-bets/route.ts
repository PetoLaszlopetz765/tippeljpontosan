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

    const myBets = await prisma.bet.findMany({
      where: { userId },
      select: { eventId: true },
    });

    const myEventIds = Array.from(new Set(myBets.map((bet) => bet.eventId)));

    const closedEvents = await prisma.event.findMany({
      where: { status: { in: ["CLOSED", "LEZÁRT"] } },
      select: { id: true },
    });

    const closedEventIds = closedEvents.map((event) => event.id);

    const visibleEventIds = Array.from(new Set([...myEventIds, ...closedEventIds]));

    if (visibleEventIds.length === 0) {
      return NextResponse.json({ bets: [], userEventIds: [] });
    }

    // Minden tipp lekérése, admin tippek nélkül, csak bejelentkezett felhasználónak
    const bets = await prisma.bet.findMany({
      where: {
        eventId: { in: visibleEventIds },
        user: {
          username: {
            not: "admin"
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            points: true,
          },
        },
        event: {
          include: {
            dailyPool: true,
          },
        },
      },
      orderBy: [
        { event: { kickoffTime: "desc" } },
        { user: { username: "asc" } },
      ],
    });
    console.log("API /bets/all-bets: bets count:", bets.length);
    if (bets.length > 0) {
      console.log("API /bets/all-bets: first bet event:", bets[0].event);
      console.log("API /bets/all-bets: first bet dailyPool:", bets[0].event.dailyPool);
    }

    // Dinamikusan átszámoljuk a carriedFromPrevious értékeket
    const allEvents = await prisma.event.findMany({
      include: { dailyPool: true },
      orderBy: { kickoffTime: "asc" },
    });

    // Rekurzív pool halmozódás minden eseményre (időrendben)
    // Először építsünk egy eventId -> event map-et, hogy gyors legyen a lookup
    const eventMap = new Map();
    for (const e of allEvents) {
      if (e.dailyPool) eventMap.set(e.id, e);
    }

    let runningCarry = 0;
    for (const e of allEvents) {
      if (!e.dailyPool) continue;

      const currentDaily = e.dailyPool.totalDaily || 0;
      e.dailyPool.carriedFromPrevious = runningCarry;

      if (e.dailyPool.totalDistributed === 0) {
        runningCarry = runningCarry + currentDaily;
      } else {
        runningCarry = 0;
      }
    }

    // Most minden bet.event.dailyPool-ban a helyes carriedFromPrevious lesz, ha az eventMap-ből frissítjük
    for (const bet of bets) {
      if (!bet.event.dailyPool) continue;
      const updatedEvent = eventMap.get(bet.event.id);
      if (updatedEvent && updatedEvent.dailyPool) {
        bet.event.dailyPool.carriedFromPrevious = updatedEvent.dailyPool.carriedFromPrevious;
        bet.event.dailyPool.totalDaily = updatedEvent.dailyPool.totalDaily;
        bet.event.dailyPool.totalDistributed = updatedEvent.dailyPool.totalDistributed;
      }
    }

    return NextResponse.json({ bets, userEventIds: visibleEventIds });
  } catch (err) {
    console.error("All bets error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}
