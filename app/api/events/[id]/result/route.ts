import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// pontozási szabályok (ugyanaz mint a bets route-ban)
function calculatePoints(predicted: {home: number, away: number}, actual: {home: number, away: number}) {
  const { home: pH, away: pA } = predicted;
  const { home: aH, away: aA } = actual;

  if (pH === aH && pA === aA) return 6; // telitalálat

  const predictedDiff = pH - pA;
  const actualDiff = aH - aA;

  const predictedWinner = predictedDiff > 0 ? "H" : predictedDiff < 0 ? "A" : "D";
  const actualWinner = actualDiff > 0 ? "H" : actualDiff < 0 ? "A" : "D";

  // 4 pontos kategória
  if (predictedWinner === actualWinner && Math.abs(predictedDiff) >= 4 && Math.abs(actualDiff) >= 4) return 4;

  // 3 pont: győztes és gólkülönbség
  if (predictedWinner === actualWinner && predictedDiff === actualDiff) return 3;

  // döntetlen helyes
  if (actualWinner === "D" && predictedWinner === "D") return 3;

  // 2 pont: győztes, de nem telitalálat és nem 4 pont
  if (predictedWinner === actualWinner) return 2;

  return 0;
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    console.log("=== RESULT ENDPOINT CALLED ===");
    
    // Next.js 16-ban a params Promise-ként érkezik
    const params = await props.params;
    const eventId = parseInt(params.id);
    
    console.log("Event ID:", eventId);
    console.log("Request headers:", Object.fromEntries(req.headers));
    
    // Auth ellenőrzés
    const authHeader = req.headers.get("authorization");
    console.log("Auth header:", authHeader);
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No auth header");
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak eredményt felvinni" },
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

    const body = await req.json();
    const { finalHomeGoals, finalAwayGoals } = body;

    console.log("Result data received:", { finalHomeGoals, finalAwayGoals });

    if (finalHomeGoals === undefined || finalAwayGoals === undefined || isNaN(finalHomeGoals) || isNaN(finalAwayGoals)) {
      console.log("❌ Invalid result data");
      return NextResponse.json(
        { message: "Hiányzik a végeredmény vagy nem szám az érték" },
        { status: 400 }
      );
    }

    // Esemény lekérése és állapot ellenőrzése
    const eventToCheck = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!eventToCheck) {
      return NextResponse.json(
        { message: "Esemény nem található" },
        { status: 404 }
      );
    }

    // Automatikus lezárás logika: 2 órával a kickoffTime előtt, de ha már lezárt az esemény, akkor engedjük
    const kickoffTime = new Date(eventToCheck.kickoffTime);
    const twoHoursBeforeKickoff = new Date(kickoffTime.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    // Ha még nem múlt el a 2 órás határidő, csak akkor tiltsuk, ha az esemény nincs lezárva
    if (now < twoHoursBeforeKickoff && eventToCheck.status !== "CLOSED" && eventToCheck.status !== "LEZÁRT") {
      return NextResponse.json(
        { message: "Még túl korai az eredmény beírásához. Legalább 2 órával a meccs előtt lehet lezárni, vagy zárd le az eseményt előbb!" },
        { status: 403 }
      );
    }

    // Ha nem lezárt az esemény, akkor lezárjuk
    let event = eventToCheck;
    if (event.status !== "CLOSED" && event.status !== "LEZÁRT") {
      event = await prisma.event.update({
        where: { id: eventId },
        data: {
          status: "CLOSED",
        },
      });
      console.log("✓ Event auto-closed due to time limit");
    }

    // Esemény frissítése az eredménnyel
    event = await prisma.event.update({
      where: { id: eventId },
      data: {
        finalHomeGoals: finalHomeGoals,
        finalAwayGoals: finalAwayGoals,
      },
    });

    console.log("✓ Event updated with result:", event);

    // Összes tipp lekérése erre az eseményre
    const allBets = await prisma.bet.findMany({
      where: { eventId },
    });

    console.log(`Found ${allBets.length} bets for this event`);

    // Pontok újraszámítása minden tipphez
    const winningBets = [];
    
    for (const bet of allBets) {
      const points = calculatePoints(
        { home: bet.predictedHomeGoals, away: bet.predictedAwayGoals },
        { home: finalHomeGoals, away: finalAwayGoals }
      );

      console.log(`  Bet ${bet.id} (user ${bet.userId}): ${points} points`);

      // Tipp frissítése az új pontokkal
      await prisma.bet.update({
        where: { id: bet.id },
        data: { pointsAwarded: points },
      });

      // Nyertes tippek gyűjtése (6 pont = telitalálat)
      if (points === 6) {
        winningBets.push(bet.userId);
      }

      // Felhasználó teljes pontjainak frissítése
      const totalPoints = await prisma.bet.aggregate({
        where: { userId: bet.userId },
        _sum: { pointsAwarded: true },
      });

      await prisma.user.update({
        where: { id: bet.userId },
        data: { points: totalPoints._sum.pointsAwarded || 0 },
      });
    }


    // Eseményenkénti pool logika: minden eseménynek saját poolja van
    const totalCreditsSpent = allBets.reduce((sum, bet) => sum + (bet.creditSpent || 0), 0);
    const dailyAmount = Math.floor(totalCreditsSpent * 0.6);
    const championshipAmount = totalCreditsSpent - dailyAmount;
    
    // Az esemény dátuma
    const eventDate = new Date(event.kickoffTime);
    const eventDateString = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // DailyPool létrehozása vagy lekérése az eseményhez
    let dailyPool = await prisma.dailyPool.findUnique({
      where: { eventId },
    });

    // Az előző esemény maradéka csak akkor jön át, ha nem lett kiosztva
    const previousEvent = await prisma.event.findFirst({
      where: {
        kickoffTime: { lt: event.kickoffTime },
        status: { in: ["CLOSED", "LEZÁRT"] },
      },
      orderBy: { kickoffTime: "desc" },
      include: { dailyPool: true },
    });

    const carriedFromPrevious = previousEvent?.dailyPool && previousEvent.dailyPool.totalDistributed === 0
      ? (previousEvent.dailyPool.totalDaily + previousEvent.dailyPool.carriedFromPrevious)
      : 0;

    if (!dailyPool) {
      
      dailyPool = await prisma.dailyPool.create({
        data: {
          eventId,
          date: new Date(eventDateString),
          totalDaily: dailyAmount,
          carriedFromPrevious,
        },
      });
    } else {
      // Pool már létezik, frissítjük (ha újra futtatják az eredményt)
      dailyPool = await prisma.dailyPool.update({
        where: { eventId },
        data: {
          totalDaily: dailyAmount,
          carriedFromPrevious,
        },
      });
    }

    let poolCarry = 0;
    let poolDistributed = false;
    let winners: number[] = [];
    let winnerType = "telitalálat";

    if (winningBets.length > 0) {
      // Csak a telitalálatosok (6 pontos) kapják a napi poolt
      winners = winningBets;
    } else {
      // Döntő speciális szabály
      const isFinal = event.finalHomeGoals !== null && event.finalAwayGoals !== null && eventToCheck.status === "FINAL";
      if (isFinal) {
        // Döntő: ha nincs telitalálat, azok között osztjuk, akik eltalálták a győztest vagy döntetlent
        const actualDiff = (event.finalHomeGoals ?? 0) - (event.finalAwayGoals ?? 0);
        const actualWinner = actualDiff > 0 ? "H" : actualDiff < 0 ? "A" : "D";
        const altWinners = allBets.filter(bet => {
          const predDiff = bet.predictedHomeGoals - bet.predictedAwayGoals;
          const predWinner = predDiff > 0 ? "H" : predDiff < 0 ? "A" : "D";
          return predWinner === actualWinner;
        }).map(bet => bet.userId);
        if (altWinners.length > 0) {
          winners = altWinners;
          winnerType = "győztes/döntetlen találat (döntő)";
        }
      }
    }

    if (winners.length > 0) {
      // Esemény pool és átgöngyölésből szét kell osztani
      const totalToDistribute = dailyPool.totalDaily + dailyPool.carriedFromPrevious;
      const creditPerWinner = winners.length > 0 ? Math.floor(totalToDistribute / winners.length) : 0;
      
      // Nyertesek krediteinek növelése
      for (const userId of winners) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            credits: {
              increment: creditPerWinner,
            },
          },
        });
      }
      
      // Esemény pool nullázása és totalDistributed frissítése
      await prisma.dailyPool.update({
        where: { eventId },
        data: { 
          totalDaily: 0, 
          carriedFromPrevious: 0,
          totalDistributed: totalToDistribute,
        },
      });
      
      // Bajnoki pool frissítése (globális)
      await prisma.creditPool.upsert({
        where: { id: 1 },
        update: { totalChampionship: { increment: championshipAmount } },
        create: { id: 1, totalDaily: 0, totalChampionship: championshipAmount },
      });
      
      poolDistributed = true;
    } else {
      // Nincs nyertes: esemény pool marad és átgöngyölődik a következő eseményre
      // A dailyPool már tartalmazza a totalDaily összeget
      poolCarry = dailyPool.totalDaily + dailyPool.carriedFromPrevious;
      
      // Bajnoki pool frissítése (globális)
      await prisma.creditPool.upsert({
        where: { id: 1 },
        update: { totalChampionship: { increment: championshipAmount } },
        create: { id: 1, totalDaily: 0, totalChampionship: championshipAmount },
      });
    }

    console.log("✓ All done!");
    let msg = `Eredmény felvéve! ${allBets.length} felhasználó pontjai frissítve.`;
    if (poolDistributed) {
      msg += ` Napi pool kiosztva (${winnerType}), nyertesek száma: ${winners.length}.`;
    } else {
      msg += ` Nincs nyertes, a napi pool halmozódik (${poolCarry} kredit).`;
    }
    return NextResponse.json({
      message: msg,
      event,
      poolDistributed,
      winners,
      poolCarry,
    });
  } catch (err) {
    console.error("❌ Result update error:", err);
    return NextResponse.json(
      { message: `Hiba az eredmény felvételekor: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
