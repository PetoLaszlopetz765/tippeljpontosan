// app/api/bets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// pontozási szabályok
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

export async function POST(req: NextRequest) {
  try {
    // Token-ből kinyerni a userId-t
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: number;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      userId = decoded.userId;
    } catch (err) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const body = await req.json();

    // body: [{ eventId, predictedHomeGoals, predictedAwayGoals }, ...]

    // Tranzakcióban kezeljük a teljes folyamatot
    const result = await prisma.$transaction(async (tx) => {
      // Lekérjük a felhasználó jelenlegi kreditit
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("Felhasználó nem található");
      }

      let totalCreditNeeded = 0;
      const betsToProcess = [];

      // Első körben ellenőrizzük, hogy van-e elég kredit
      for (const bet of body) {
        const event = await tx.event.findUnique({ where: { id: bet.eventId } });
        if (!event) continue;

        // Ellenőrizzük, hogy már van-e erre a felhasználónak tipja
        const existingBet = await tx.bet.findUnique({
          where: { userId_eventId: { userId, eventId: bet.eventId } },
        });

        // Ha új tipp, akkor kell a kredit
        if (!existingBet) {
          totalCreditNeeded += event.creditCost;
        }

        betsToProcess.push({ ...bet, event });
      }

      // Kredit ellenőrzés
      if (user.credits < totalCreditNeeded) {
        throw new Error(`Nincs elég kreditje! Szükséges: ${totalCreditNeeded}, Rendelkezésre álló: ${user.credits}`);
      }

      // Kreditek levonása és tippek feldolgozása
      let creditSpent = 0;

      for (const betData of betsToProcess) {
        const { event, eventId, predictedHomeGoals, predictedAwayGoals } = betData;

        const points = event.finalHomeGoals !== null && event.finalAwayGoals !== null
          ? calculatePoints(
              { home: predictedHomeGoals, away: predictedAwayGoals },
              { home: event.finalHomeGoals, away: event.finalAwayGoals }
            )
          : 0;

        // Ellenőrizzük, hogy már van-e erre a felhasználónak tipja
        const existingBet = await tx.bet.findUnique({
          where: { userId_eventId: { userId, eventId } },
        });


        if (!existingBet) {
          // Új tipp - kredit levonása
          creditSpent += event.creditCost;
        }
        // Minden tippnél (csak új tippnél van kredit levonás, de pool mindig nő)
        const dailyAmount = Math.floor(event.creditCost * 0.6);
        const championshipAmount = event.creditCost - dailyAmount;
        // Frissítjük vagy létrehozzuk a dailyPool rekordot
        const existingPool = await tx.dailyPool.findUnique({ where: { eventId } });
        if (existingPool) {
          await tx.dailyPool.update({
            where: { eventId },
            data: { totalDaily: { increment: dailyAmount } },
          });
        } else {
          await tx.dailyPool.create({
            data: {
              eventId,
              date: new Date(event.kickoffTime),
              totalDaily: dailyAmount,
              carriedFromPrevious: 0,
              totalDistributed: 0,
            },
          });
        }
        // Bajnoki (globális) pool frissítése vagy létrehozása
        await tx.creditPool.upsert({
          where: { id: 1 },
          update: { totalChampionship: { increment: championshipAmount } },
          create: { id: 1, totalDaily: 0, totalChampionship: championshipAmount },
        });

        // UPSERT tipp
        await tx.bet.upsert({
          where: { userId_eventId: { userId, eventId } },
          update: { 
            predictedHomeGoals, 
            predictedAwayGoals, 
            pointsAwarded: points 
          },
          create: { 
            userId, 
            eventId, 
            predictedHomeGoals, 
            predictedAwayGoals, 
            pointsAwarded: points,
            creditSpent: event.creditCost
          },
        });

        // pontok frissítése a felhasználónál (összesítés)
        const totalPoints = await tx.bet.aggregate({
          where: { userId },
          _sum: { pointsAwarded: true },
        });

        await tx.user.update({
          where: { id: userId },
          data: { points: totalPoints._sum.pointsAwarded || 0 },
        });
      }

      // Felhasználó kreditjeinek frissítése
      if (creditSpent > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { credits: { decrement: creditSpent } },
        });
      }

      return { creditSpent };
    });

    return NextResponse.json({ 
      message: `✅ Tippek leadva! ${result.creditSpent > 0 ? `${result.creditSpent} kredit levonásra került.` : 'Már meglévő tippek frissítve.'}`,
      creditSpent: result.creditSpent
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Hiba a tippek leadásakor" }, { status: 500 });
  }
}
