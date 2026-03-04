import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const eventId = parseInt(params.id);

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ message: "Érvénytelen esemény azonosító" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak eseményt visszanyitni" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin nyithat vissza eseményt" }, { status: 403 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ message: "Esemény nem található" }, { status: 404 });
    }

    if (event.finalHomeGoals !== null || event.finalAwayGoals !== null) {
      return NextResponse.json(
        { message: "Eredménnyel rendelkező eseményt nem lehet visszanyitni." },
        { status: 400 }
      );
    }

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: "OPEN" },
    });

    return NextResponse.json({
      message: "Esemény sikeresen visszanyitva",
      event: updatedEvent,
    });
  } catch (err) {
    console.error("Reopen event error:", err);
    return NextResponse.json({ message: "Hiba az esemény visszanyitásakor" }, { status: 500 });
  }
}
