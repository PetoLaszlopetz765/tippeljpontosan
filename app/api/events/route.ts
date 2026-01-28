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

    // Közvetlenül mentjük az admin által kiválasztott időpontot, időzóna konverzió nélkül
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

    // Dinamikusan átszámoljuk a carriedFromPrevious értékeket rekurzívan, hogy a teljes halmozódás átjöjjön
    // Feltételezzük, hogy events időrendben vannak rendezve kickoffTime szerint (orderBy: asc)
    let lastCarried = 0;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event.dailyPool) continue;

      // Ha az előző esemény poolja nem lett szétosztva, hozzáadjuk a teljes halmozódást
      if (lastCarried > 0) {
        event.dailyPool.carriedFromPrevious = lastCarried;
      }

      // Ha az aktuális esemény poolja nem lett szétosztva, tovább halmozunk
      if (event.dailyPool.totalDistributed === 0) {
        lastCarried = (event.dailyPool.totalDaily || 0) + (event.dailyPool.carriedFromPrevious || 0);
      } else {
        lastCarried = 0;
      }
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Hiba az események lekérésekor" },
      { status: 500 }
    );
  }
}
