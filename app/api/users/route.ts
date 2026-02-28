import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Nincs bejelentkezve" },
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

    // Admin check
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Nincs jogosultságod" },
        { status: 403 }
      );
    }

    // Get all users (without passwords)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        points: true,
        credits: true,
        tipsCountAdjustment: true,
        perfectCountAdjustment: true,
        bets: {
          select: {
            pointsAwarded: true,
          },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    const usersWithStats = users.map((user) => {
      const tipsCount = user.bets.length;
      const perfectCount = user.bets.filter((bet) => bet.pointsAwarded === 6).length;
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        points: user.points,
        credits: user.credits,
        tipsCount,
        perfectCount,
        tipsCountAdjustment: user.tipsCountAdjustment,
        perfectCountAdjustment: user.perfectCountAdjustment,
        finalTipsCount: Math.max(0, tipsCount + user.tipsCountAdjustment),
        finalPerfectCount: Math.max(0, perfectCount + user.perfectCountAdjustment),
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (err) {
    console.error("Get users error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Nincs bejelentkezve" },
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

    // Admin check
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Nincs jogosultságod" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, password, role } = body;

    if (!username || !password) {
      return NextResponse.json(
        { message: "Felhasználónév és jelszó szükséges" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Ez a felhasználónév már foglalt" },
        { status: 400 }
      );
    }

    // Create user
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || "USER",
        points: 0,
        tipsCountAdjustment: 0,
        perfectCountAdjustment: 0,
      },
      select: {
        id: true,
        username: true,
        role: true,
        points: true,
        tipsCountAdjustment: true,
        perfectCountAdjustment: true,
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}
