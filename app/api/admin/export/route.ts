import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin!" }, { status: 403 });
    }

    const [
      settings,
      users,
      inviteCodes,
      events,
      bets,
      creditPools,
      dailyPools,
      chatMessages,
      betsForView,
    ] = await Promise.all([
      prisma.setting.findMany({ orderBy: { id: "asc" } }),
      prisma.user.findMany({ orderBy: { id: "asc" } }),
      prisma.inviteCode.findMany({ orderBy: { code: "asc" } }),
      prisma.event.findMany({ orderBy: { id: "asc" } }),
      prisma.bet.findMany({ orderBy: { id: "asc" } }),
      prisma.creditPool.findMany({ orderBy: { id: "asc" } }),
      prisma.dailyPool.findMany({ orderBy: { id: "asc" } }),
      prisma.chatMessage.findMany({ orderBy: { id: "asc" } }),
      prisma.bet.findMany({
        include: {
          user: {
            select: {
              username: true,
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
      }),
    ]);

    const workbook = XLSX.utils.book_new();

    const appendSheet = (name: string, rows: Array<Record<string, unknown>>) => {
      const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ info: "Nincs adat" }]);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };

    const allTipsViewRows = (() => {
      const groupedByEvent = new Map<number, typeof betsForView>();
      for (const bet of betsForView) {
        if (!groupedByEvent.has(bet.eventId)) {
          groupedByEvent.set(bet.eventId, [] as typeof betsForView);
        }
        groupedByEvent.get(bet.eventId)!.push(bet);
      }

      const rows: Array<Record<string, unknown>> = [];

      for (const [eventId, eventBets] of groupedByEvent.entries()) {
        const event = eventBets[0]?.event;
        if (!event) continue;

        const nonAdminBets = eventBets.filter(
          (bet) => (bet.user?.username || "").toLowerCase() !== "admin"
        );
        const winners = nonAdminBets.filter((bet) => bet.pointsAwarded === 6);
        const winnersCount = winners.length;
        const totalDistributed = event.dailyPool?.totalDistributed || 0;

        const resultText =
          event.finalHomeGoals !== null && event.finalAwayGoals !== null
            ? `${event.finalHomeGoals}-${event.finalAwayGoals}`
            : "-";

        const poolStateText = (() => {
          const dailyPool = event.dailyPool;
          if (!dailyPool) return "-";
          const poolTotal = (dailyPool.totalDaily || 0) + (dailyPool.carriedFromPrevious || 0);
          const distributed = dailyPool.totalDistributed || 0;
          if (distributed > 0) return `Pool szétosztva: ${distributed}`;
          if (poolTotal > 0) return `Pool halmozódik: ${poolTotal}`;
          return "-";
        })();

        for (const bet of eventBets) {
          const username = bet.user?.username || "ismeretlen";
          const isEligibleWinner =
            event.finalHomeGoals !== null &&
            bet.pointsAwarded === 6 &&
            winnersCount > 0 &&
            username.toLowerCase() !== "admin" &&
            totalDistributed > 0;
          const wonCredit = isEligibleWinner ? Math.floor(totalDistributed / winnersCount) : (event.finalHomeGoals !== null ? 0 : "-");

          rows.push({
            eventId,
            esemeny: `${event.homeTeam} - ${event.awayTeam}`,
            kezdes: event.kickoffTime,
            feltettKredit: event.creditCost,
            vegeredmeny: resultText,
            poolAllapot: poolStateText,
            jatekos: username,
            tipp: `${bet.predictedHomeGoals}-${bet.predictedAwayGoals}`,
            pont: bet.pointsAwarded,
            nyeremenyKredit: wonCredit,
          });
        }
      }

      return rows;
    })();

    appendSheet("Setting", settings);
    appendSheet("User", users);
    appendSheet("InviteCode", inviteCodes);
    appendSheet("Event", events);
    appendSheet("Bet", bets);
    appendSheet("OsszesTippekNezet", allTipsViewRows);
    appendSheet("CreditPool", creditPools);
    appendSheet("DailyPool", dailyPools);
    appendSheet("ChatMessage", chatMessages);

    const fileBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `sportfogadas-backup-${timestamp}.xlsx`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Admin export error:", err);
    return NextResponse.json({ message: "Hiba export közben" }, { status: 500 });
  }
}
