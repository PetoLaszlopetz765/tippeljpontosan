import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

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
    const user = await prisma.user.findUnique({
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
