import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin törölhet!" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const providedPassword = String(body?.password || "").trim();
    if (!providedPassword) {
      return NextResponse.json({ message: "Add meg az admin jelszót a törléshez." }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({ where: { id: Number(decoded.userId) } });
    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ message: "Admin felhasználó nem található." }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(providedPassword, adminUser.password);
    if (!validPassword) {
      return NextResponse.json({ message: "Hibás admin jelszó." }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      // FK-biztos törlési sorrend: függő rekordok -> szülők
      await tx.bet.deleteMany();
      await tx.dailyPool.deleteMany();
      await tx.chatMessage.deleteMany();
      await tx.event.deleteMany();
      await tx.inviteCode.deleteMany();
      await tx.setting.deleteMany();

      await tx.user.deleteMany({ where: { role: { not: "ADMIN" } } });

      await tx.user.updateMany({
        where: { role: "ADMIN" },
        data: {
          points: 0,
          credits: 0,
          chatLastReadAt: null,
          tipsCountAdjustment: 0,
          perfectCountAdjustment: 0,
        },
      });

      await tx.creditPool.deleteMany();
      await tx.creditPool.create({ data: { totalDaily: 0, totalChampionship: 0 } });
    });

    return NextResponse.json({
      message:
        "Hard reset kész: tippek, események, daily poolok, chat üzenetek, meghívókódok, beállítások és nem-admin felhasználók törölve. A credit pool alaphelyzetbe állt.",
    });
  } catch (error) {
    console.error("Hard reset hiba:", error);
    return NextResponse.json({ message: "Hiba történt hard reset közben." }, { status: 500 });
  }
}
