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

    // A kickoffTime stringet (pl. '2026-02-22T18:45') Europe/Budapest időzónaként értelmezzük, majd UTC-re konvertáljuk
    function parseBudapestToUTC(localDateTimeStr: string) {
      // Feltételezzük, hogy a string formátuma 'YYYY-MM-DDTHH:mm'
      const [datePart, timePart] = localDateTimeStr.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      // Budapest időzóna offset (télen +1, nyáron +2) - ezt a DateTimeFormat-ból lekérjük
      const dtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Budapest', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      // Budapest időben létrehozott dátum
      const asIfUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
      // A Budapest időhöz tartozó UTC offsetet lekérjük
      const parts = dtf.formatToParts(asIfUTC);
      // A formatToParts visszaadja a helyi időt, de a Date objektum UTC-ben van, ezért a különbséget ki kell számolni
      // Budapest idő: parts-ból összerakjuk a helyi időt
      const budapestHour = Number((parts.find(p => p.type === 'hour')?.value ?? 0));
      const budapestMinute = Number((parts.find(p => p.type === 'minute')?.value ?? 0));
      // Ha a Date UTC órája nem egyezik a Budapest órával, akkor van offset
      const utcHour = asIfUTC.getUTCHours();
      const utcMinute = asIfUTC.getUTCMinutes();
      // Offset percben
      const offsetMinutes = ((budapestHour - utcHour) * 60) + (budapestMinute - utcMinute);
      // A helyes UTC idő: asIfUTC - offset
      const utcDate = new Date(asIfUTC.getTime() - offsetMinutes * 60000);
      return utcDate;
    }

    const kickoffUTC = parseBudapestToUTC(kickoffTime);

    const event = await prisma.event.create({
      data: {
        homeTeam,
        awayTeam,
        kickoffTime: kickoffUTC,
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

    // Dinamikus, determinisztikus göngyölítés:
    // carriedFromPrevious mindig az előző, KI NEM osztott összeg legyen.
    let runningCarry = 0;
    for (const event of events) {
      if (!event.dailyPool) continue;

      const currentDaily = event.dailyPool.totalDaily || 0;
      event.dailyPool.carriedFromPrevious = runningCarry;

      if (event.dailyPool.totalDistributed === 0) {
        runningCarry = runningCarry + currentDaily;
      } else {
        runningCarry = 0;
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
