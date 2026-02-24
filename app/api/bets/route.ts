// app/api/bets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

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

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ message: "Nincs feldolgozható tipp" }, { status: 400 });
    }

    // Tranzakcióban kezeljük a teljes folyamatot
    const result = await prisma.$transaction(async (tx) => {
      // Lekérjük a felhasználó jelenlegi kreditit
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error("Felhasználó nem található");
      }

      const requestedEventIds = Array.from(
        new Set(
          body
            .map((bet: any) => Number(bet?.eventId))
            .filter((eventId: number) => Number.isFinite(eventId))
        )
      );

      const events = await tx.event.findMany({
        where: { id: { in: requestedEventIds } },
        select: {
          id: true,
          creditCost: true,
          finalHomeGoals: true,
          finalAwayGoals: true,
        },
      });

      const eventById = new Map(events.map((event) => [event.id, event]));

      const existingBets = await tx.bet.findMany({
        where: {
          userId,
          eventId: { in: requestedEventIds },
        },
        select: { eventId: true },
      });

      const existingEventIds = new Set(existingBets.map((bet) => bet.eventId));

      let totalCreditNeeded = 0;
      for (const eventId of requestedEventIds) {
        if (existingEventIds.has(eventId)) continue;
        const event = eventById.get(eventId);
        if (!event) continue;
        totalCreditNeeded += event.creditCost;
      }

      // Kredit ellenőrzés
      if (user.credits < totalCreditNeeded) {
        throw new Error(`Nincs elég kreditje! Szükséges: ${totalCreditNeeded}, Rendelkezésre álló: ${user.credits}`);
      }

      // Kreditek levonása és tippek feldolgozása
      let creditSpent = 0;

      for (const betData of body) {
        const eventId = Number(betData?.eventId);
        const predictedHomeGoals = Number(betData?.predictedHomeGoals);
        const predictedAwayGoals = Number(betData?.predictedAwayGoals);

        if (!Number.isFinite(eventId) || !Number.isFinite(predictedHomeGoals) || !Number.isFinite(predictedAwayGoals)) {
          continue;
        }

        const event = eventById.get(eventId);
        if (!event) {
          continue;
        }

        const points = event.finalHomeGoals !== null && event.finalAwayGoals !== null
          ? calculatePoints(
              { home: predictedHomeGoals, away: predictedAwayGoals },
              { home: event.finalHomeGoals, away: event.finalAwayGoals }
            )
          : 0;

        let createdNewBet = false;

        try {
          await tx.bet.create({
            data: {
              userId,
              eventId,
              predictedHomeGoals,
              predictedAwayGoals,
              pointsAwarded: points,
              creditSpent: event.creditCost,
            },
          });
          createdNewBet = true;
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            await tx.bet.update({
              where: { userId_eventId: { userId, eventId } },
              data: {
                predictedHomeGoals,
                predictedAwayGoals,
                pointsAwarded: points,
              },
            });
          } else {
            throw error;
          }
        }

        if (createdNewBet) {
          creditSpent += event.creditCost;

          const dailyAmount = Math.floor(event.creditCost * 0.6);
          const championshipAmount = event.creditCost - dailyAmount;

          const existingPool = await tx.dailyPool.findUnique({ where: { eventId } });
          if (existingPool) {
            await tx.dailyPool.update({
              where: { eventId },
              data: { totalDaily: { increment: dailyAmount } },
            });
          } else {
            const fullEvent = await tx.event.findUnique({ where: { id: eventId } });
            if (fullEvent) {
              await tx.dailyPool.create({
                data: {
                  eventId,
                  date: new Date(fullEvent.kickoffTime),
                  totalDaily: dailyAmount,
                  carriedFromPrevious: 0,
                  totalDistributed: 0,
                },
              });
            }
          }

          await tx.creditPool.upsert({
            where: { id: 1 },
            update: { totalChampionship: { increment: championshipAmount } },
            create: { id: 1, totalDaily: 0, totalChampionship: championshipAmount },
          });
        }
      }

      // Felhasználó kreditjeinek és pontjainak frissítése csak az összes tipp feldolgozása után
      const totalPoints = await tx.bet.aggregate({
        where: { userId },
        _sum: { pointsAwarded: true },
      });

      // Csak akkor frissítünk, ha voltak új tippek (creditSpent > 0)
      if (creditSpent > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            points: totalPoints._sum.pointsAwarded || 0,
            credits: { decrement: creditSpent },
          },
        });
      }

      return { creditSpent };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ 
      message: `✅ Tippek leadva! ${result.creditSpent > 0 ? `${result.creditSpent} kredit levonásra került.` : 'Már meglévő tippek frissítve.'}`,
      creditSpent: result.creditSpent
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Hiba a tippek leadásakor" }, { status: 500 });
  }
}
