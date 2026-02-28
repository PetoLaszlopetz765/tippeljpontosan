import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "igen"].includes(lowered)) return true;
    if (["false", "0", "no", "nem"].includes(lowered)) return false;
  }
  return fallback;
}

function excelSerialToDate(serial: number): Date | null {
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S));
}

function toDate(value: unknown, fallback?: Date): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const fromSerial = excelSerialToDate(value);
    if (fromSerial) return fromSerial;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function readSheet<T = Record<string, unknown>>(workbook: XLSX.WorkBook, sheetName: string): T[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length === 1 && rows[0]?.info === "Nincs adat") return [];
  return rows as T[];
}

export async function POST(req: NextRequest) {
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

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Hiányzó fájl" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const settings = readSheet(workbook, "Setting");
    const users = readSheet(workbook, "User");
    const inviteCodes = readSheet(workbook, "InviteCode");
    const events = readSheet(workbook, "Event");
    const creditPools = readSheet(workbook, "CreditPool");
    const dailyPools = readSheet(workbook, "DailyPool");
    const chatMessages = readSheet(workbook, "ChatMessage");
    const bets = readSheet(workbook, "Bet");

    const stats = {
      setting: 0,
      user: 0,
      inviteCode: 0,
      event: 0,
      creditPool: 0,
      dailyPool: 0,
      chatMessage: 0,
      bet: 0,
    };

    await prisma.$transaction(async (tx) => {
      for (const row of settings) {
        const key = String(row.key ?? "").trim();
        if (!key) continue;
        await tx.setting.upsert({
          where: { key },
          update: { value: String(row.value ?? "") },
          create: { key, value: String(row.value ?? "") },
        });
        stats.setting++;
      }

      for (const row of users) {
        const id = toNumber(row.id, 0);
        const username = String(row.username ?? "").trim();
        const password = String(row.password ?? "").trim();
        if (!id || !username || !password) continue;

        await tx.user.upsert({
          where: { id },
          update: {
            username,
            password,
            role: String(row.role ?? "USER"),
            points: toNumber(row.points, 0),
            credits: toNumber(row.credits, 0),
            tipsCountAdjustment: toNumber(row.tipsCountAdjustment, 0),
            perfectCountAdjustment: toNumber(row.perfectCountAdjustment, 0),
          },
          create: {
            id,
            username,
            password,
            role: String(row.role ?? "USER"),
            points: toNumber(row.points, 0),
            credits: toNumber(row.credits, 0),
            tipsCountAdjustment: toNumber(row.tipsCountAdjustment, 0),
            perfectCountAdjustment: toNumber(row.perfectCountAdjustment, 0),
          },
        });
        stats.user++;
      }

      for (const row of inviteCodes) {
        const code = String(row.code ?? "").trim();
        if (!code) continue;
        await tx.inviteCode.upsert({
          where: { code },
          update: { used: toBoolean(row.used, false) },
          create: { code, used: toBoolean(row.used, false) },
        });
        stats.inviteCode++;
      }

      for (const row of events) {
        const id = toNumber(row.id, 0);
        const homeTeam = String(row.homeTeam ?? "").trim();
        const awayTeam = String(row.awayTeam ?? "").trim();
        const kickoffTime = toDate(row.kickoffTime);
        if (!id || !homeTeam || !awayTeam || !kickoffTime) continue;

        await tx.event.upsert({
          where: { id },
          update: {
            homeTeam,
            awayTeam,
            kickoffTime,
            status: String(row.status ?? "OPEN"),
            finalHomeGoals: row.finalHomeGoals === null ? null : toNumber(row.finalHomeGoals, 0),
            finalAwayGoals: row.finalAwayGoals === null ? null : toNumber(row.finalAwayGoals, 0),
            creditCost: toNumber(row.creditCost, 100),
          },
          create: {
            id,
            homeTeam,
            awayTeam,
            kickoffTime,
            status: String(row.status ?? "OPEN"),
            finalHomeGoals: row.finalHomeGoals === null ? null : toNumber(row.finalHomeGoals, 0),
            finalAwayGoals: row.finalAwayGoals === null ? null : toNumber(row.finalAwayGoals, 0),
            creditCost: toNumber(row.creditCost, 100),
          },
        });
        stats.event++;
      }

      for (const row of creditPools) {
        const id = toNumber(row.id, 0);
        if (!id) continue;
        await tx.creditPool.upsert({
          where: { id },
          update: {
            totalDaily: toNumber(row.totalDaily, 0),
            totalChampionship: toNumber(row.totalChampionship, 0),
          },
          create: {
            id,
            totalDaily: toNumber(row.totalDaily, 0),
            totalChampionship: toNumber(row.totalChampionship, 0),
          },
        });
        stats.creditPool++;
      }

      for (const row of dailyPools) {
        const id = toNumber(row.id, 0);
        const eventId = toNumber(row.eventId, 0);
        const date = toDate(row.date, new Date());
        if (!id || !eventId || !date) continue;

        await tx.dailyPool.upsert({
          where: { id },
          update: {
            eventId,
            date,
            totalDaily: toNumber(row.totalDaily, 0),
            carriedFromPrevious: toNumber(row.carriedFromPrevious, 0),
            totalDistributed: toNumber(row.totalDistributed, 0),
            createdAt: toDate(row.createdAt, new Date()) || new Date(),
            updatedAt: toDate(row.updatedAt, new Date()) || new Date(),
          },
          create: {
            id,
            eventId,
            date,
            totalDaily: toNumber(row.totalDaily, 0),
            carriedFromPrevious: toNumber(row.carriedFromPrevious, 0),
            totalDistributed: toNumber(row.totalDistributed, 0),
            createdAt: toDate(row.createdAt, new Date()) || new Date(),
            updatedAt: toDate(row.updatedAt, new Date()) || new Date(),
          },
        });
        stats.dailyPool++;
      }

      for (const row of chatMessages) {
        const id = toNumber(row.id, 0);
        const userId = toNumber(row.userId, 0);
        const text = String(row.text ?? "");
        if (!id || !userId || !text) continue;

        await tx.chatMessage.upsert({
          where: { id },
          update: {
            userId,
            text,
            createdAt: toDate(row.createdAt, new Date()) || new Date(),
            deleted: toBoolean(row.deleted, false),
          },
          create: {
            id,
            userId,
            text,
            createdAt: toDate(row.createdAt, new Date()) || new Date(),
            deleted: toBoolean(row.deleted, false),
          },
        });
        stats.chatMessage++;
      }

      for (const row of bets) {
        const id = toNumber(row.id, 0);
        const userId = toNumber(row.userId, 0);
        const eventId = toNumber(row.eventId, 0);
        if (!id || !userId || !eventId) continue;

        await tx.bet.upsert({
          where: { id },
          update: {
            userId,
            eventId,
            predictedHomeGoals: toNumber(row.predictedHomeGoals, 0),
            predictedAwayGoals: toNumber(row.predictedAwayGoals, 0),
            pointsAwarded: toNumber(row.pointsAwarded, 0),
            creditSpent: toNumber(row.creditSpent, 0),
          },
          create: {
            id,
            userId,
            eventId,
            predictedHomeGoals: toNumber(row.predictedHomeGoals, 0),
            predictedAwayGoals: toNumber(row.predictedAwayGoals, 0),
            pointsAwarded: toNumber(row.pointsAwarded, 0),
            creditSpent: toNumber(row.creditSpent, 0),
          },
        });
        stats.bet++;
      }
    });

    return NextResponse.json({
      message: "Import sikeres",
      stats,
    });
  } catch (err) {
    console.error("Admin import error:", err);
    return NextResponse.json({ message: "Hiba import közben" }, { status: 500 });
  }
}
