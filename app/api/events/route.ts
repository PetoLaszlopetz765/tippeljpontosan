import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function POST(req: NextRequest) {
  try {
    // Auth ellenőrzés
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak eseményt létrehozni" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    // TODO: role ellenőrzés (később kellhet ADMIN szerepkör)
    // if (decoded.role !== "ADMIN") {
    //   return NextResponse.json(
    //     { message: "Csak adminok tudnak eseményt létrehozni" },
    //     { status: 403 }
    //   );
    // }

    const { homeTeam, awayTeam, kickoffTime, status, creditCost } = await req.json();

    const event = await prisma.event.create({
      data: {
        homeTeam,
        awayTeam,
        kickoffTime: new Date(kickoffTime),
        status: status || "OPEN",
        creditCost: creditCost || 100,
      },
    });

    return NextResponse.json(event);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Hiba az esemény létrehozásakor" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      include: {
        dailyPool: true,
      },
      orderBy: { kickoffTime: "asc" },
    });
    return NextResponse.json(events);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Hiba az események lekérésekor" },
      { status: 500 }
    );
  }
}
