import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const withCode = err as { code?: string; message?: string };
  return withCode.code === "P2022" || (withCode.message ?? "").toLowerCase().includes("column");
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }
    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }
    let user:
      | {
          id: number;
          username: string;
          credits: number;
          points: number;
          role: string;
          tipsCountAdjustment: number;
          perfectCountAdjustment: number;
        }
      | null;

    try {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          credits: true,
          points: true,
          role: true,
          tipsCountAdjustment: true,
          perfectCountAdjustment: true,
        },
      });
    } catch (queryErr) {
      if (!isMissingColumnError(queryErr)) {
        throw queryErr;
      }

      const legacyUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          credits: true,
          points: true,
          role: true,
        },
      });

      user = legacyUser
        ? {
            ...legacyUser,
            tipsCountAdjustment: 0,
            perfectCountAdjustment: 0,
          }
        : null;
    }
    if (!user) return NextResponse.json({ message: "Nincs ilyen felhasználó" }, { status: 404 });

    const [baseTipsCount, basePerfectCount] = await Promise.all([
      prisma.bet.count({ where: { userId: user.id } }),
      prisma.bet.count({ where: { userId: user.id, pointsAwarded: 6 } }),
    ]);

    return NextResponse.json({
      id: user.id,
      username: user.username,
      credits: user.credits,
      points: user.points,
      role: user.role,
      tipsCount: Math.max(0, baseTipsCount + user.tipsCountAdjustment),
      perfectCount: Math.max(0, basePerfectCount + user.perfectCountAdjustment),
    });
  } catch (err) {
    return NextResponse.json({ message: "Hiba a profil lekérdezésekor" }, { status: 500 });
  }
}
