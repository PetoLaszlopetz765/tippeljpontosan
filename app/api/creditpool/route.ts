import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function GET(req: NextRequest) {
  try {
    const pool = await prisma.creditPool.findFirst();
    return NextResponse.json({
      totalDaily: pool?.totalDaily || 0,
      totalChampionship: pool?.totalChampionship || 0,
    });
  } catch (err) {
    return NextResponse.json({ message: "Hiba a pool lekérdezésekor" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin módosíthat!" }, { status: 403 });
    }

    const { totalDaily, totalChampionship } = await req.json();

    const pool = await prisma.creditPool.findFirst();
    if (!pool) {
      const newPool = await prisma.creditPool.create({
        data: {
          totalDaily: totalDaily || 0,
          totalChampionship: totalChampionship || 0,
        },
      });
      return NextResponse.json(newPool);
    }

    const updated = await prisma.creditPool.update({
      where: { id: pool.id },
      data: {
        ...(totalDaily !== undefined && { totalDaily }),
        ...(totalChampionship !== undefined && { totalChampionship }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ message: `Hiba: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
