// app/api/events/[id]/pool/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ message: "Érvénytelen esemény ID" }, { status: 400 });
    }

    // Admin ellenőrzés
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    // Admin jogosultság ellenőrzése
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Nincs jogosultság" }, { status: 403 });
    }

    const body = await req.json();
    const { totalDaily } = body;

    if (typeof totalDaily !== "number" || totalDaily < 0) {
      return NextResponse.json({ message: "Érvénytelen pool összeg" }, { status: 400 });
    }

    // Esemény ellenőrzése
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ message: "Esemény nem található" }, { status: 404 });
    }

    // DailyPool létrehozása vagy frissítése
    const dailyPool = await prisma.dailyPool.upsert({
      where: { eventId },
      update: { totalDaily },
      create: {
        eventId,
        date: new Date(event.kickoffTime),
        totalDaily,
        carriedFromPrevious: 0,
      },
    });

    return NextResponse.json({
      message: "Pool sikeresen frissítve",
      dailyPool,
    });
  } catch (err) {
    console.error("Pool update error:", err);
    return NextResponse.json({ message: "Hiba történt" }, { status: 500 });
  }
}
