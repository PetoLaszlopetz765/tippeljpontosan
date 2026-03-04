import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

function parseBudapestToUTC(localDateTimeStr: string) {
  const [datePart, timePart] = localDateTimeStr.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Budapest",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const asIfUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = dtf.formatToParts(asIfUTC);

  const budapestHour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const budapestMinute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);

  const utcHour = asIfUTC.getUTCHours();
  const utcMinute = asIfUTC.getUTCMinutes();
  const offsetMinutes = (budapestHour - utcHour) * 60 + (budapestMinute - utcMinute);

  return new Date(asIfUTC.getTime() - offsetMinutes * 60000);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const eventId = parseInt(params.id);

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ message: "Érvénytelen esemény azonosító" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin módosíthat eseményt" }, { status: 403 });
    }

    const { homeTeam, awayTeam, kickoffTime, creditCost } = await req.json();

    if (!homeTeam || !awayTeam || !kickoffTime) {
      return NextResponse.json({ message: "Hiányzó kötelező mezők" }, { status: 400 });
    }

    const parsedCreditCost = Number(creditCost);
    if (!Number.isFinite(parsedCreditCost) || parsedCreditCost < 1) {
      return NextResponse.json({ message: "Érvénytelen tipp díj" }, { status: 400 });
    }

    const kickoffUTC = parseBudapestToUTC(String(kickoffTime));
    if (!kickoffUTC || Number.isNaN(kickoffUTC.getTime())) {
      return NextResponse.json({ message: "Érvénytelen kezdési időpont" }, { status: 400 });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        homeTeam: String(homeTeam).trim(),
        awayTeam: String(awayTeam).trim(),
        kickoffTime: kickoffUTC,
        creditCost: Math.trunc(parsedCreditCost),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ message: "Esemény nem található" }, { status: 404 });
    }
    console.error("Update event error:", err);
    return NextResponse.json({ message: "Hiba az esemény módosításakor" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    console.log("=== DELETE EVENT ENDPOINT CALLED ===");
    
    const params = await props.params;
    const eventId = parseInt(params.id);
    
    console.log("Event ID:", eventId);
    
    // Auth ellenőrzés
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No auth header");
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak eseményt törölni" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("✓ Token verified:", decoded);
    } catch (err) {
      console.log("❌ Token verification failed:", err);
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Csak admin törölhet eseményt" },
        { status: 403 }
      );
    }

    const deletedBetsCount = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      const allBets = await tx.bet.findMany({
        where: { eventId },
      });

      console.log(`Found ${allBets.length} bets for this event`);

      const refundByUser = new Map<number, number>();
      for (const bet of allBets) {
        refundByUser.set(bet.userId, (refundByUser.get(bet.userId) || 0) + (bet.creditSpent || 0));
      }

      const userIds = Array.from(refundByUser.keys());

      const [affectedUsersBefore, basePointsBeforeByUser] = await Promise.all([
        tx.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, points: true },
        }),
        tx.bet.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _sum: { pointsAwarded: true },
        }),
      ]);

      const baseBeforeMap = new Map<number, number>(
        basePointsBeforeByUser.map((row) => [row.userId, row._sum.pointsAwarded || 0])
      );

      const pointsAdjustmentByUser = new Map<number, number>(
        affectedUsersBefore.map((user) => [user.id, user.points - (baseBeforeMap.get(user.id) || 0)])
      );

      await tx.bet.deleteMany({
        where: { eventId },
      });

      await tx.dailyPool.deleteMany({
        where: { eventId },
      });

      await tx.event.delete({
        where: { id: eventId },
      });

      const basePointsAfterByUser = await tx.bet.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _sum: { pointsAwarded: true },
      });

      const baseAfterMap = new Map<number, number>(
        basePointsAfterByUser.map((row) => [row.userId, row._sum.pointsAwarded || 0])
      );

      for (const userId of userIds) {
        await tx.user.update({
          where: { id: userId },
          data: {
            points: Math.max(
              0,
              (baseAfterMap.get(userId) || 0) + (pointsAdjustmentByUser.get(userId) || 0)
            ),
            credits: { increment: refundByUser.get(userId) || 0 },
          },
        });
      }

      return allBets.length;
    });

    console.log("✓ Event deleted:", eventId);

    return NextResponse.json({
      message: `Esemény és ${deletedBetsCount} tipp sikeresen törölve`,
      deletedBetsCount,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EVENT_NOT_FOUND") {
      return NextResponse.json(
        { message: "Esemény nem található" },
        { status: 404 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { message: "Hiba az esemény törlésekor" },
      { status: 500 }
    );
  }
}
