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
    ] = await Promise.all([
      prisma.setting.findMany({ orderBy: { id: "asc" } }),
      prisma.user.findMany({ orderBy: { id: "asc" } }),
      prisma.inviteCode.findMany({ orderBy: { code: "asc" } }),
      prisma.event.findMany({ orderBy: { id: "asc" } }),
      prisma.bet.findMany({ orderBy: { id: "asc" } }),
      prisma.creditPool.findMany({ orderBy: { id: "asc" } }),
      prisma.dailyPool.findMany({ orderBy: { id: "asc" } }),
      prisma.chatMessage.findMany({ orderBy: { id: "asc" } }),
    ]);

    const workbook = XLSX.utils.book_new();

    const appendSheet = (name: string, rows: Array<Record<string, unknown>>) => {
      const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ info: "Nincs adat" }]);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };

    appendSheet("Setting", settings);
    appendSheet("User", users);
    appendSheet("InviteCode", inviteCodes);
    appendSheet("Event", events);
    appendSheet("Bet", bets);
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
