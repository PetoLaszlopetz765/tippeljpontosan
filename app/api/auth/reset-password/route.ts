import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const db = prisma as any;
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    const newPassword = String(body?.newPassword || "");

    if (!token) {
      return NextResponse.json({ message: "Hiányzó visszaállító token." }, { status: 400 });
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { message: "A jelszónak legalább 6 karakter hosszúnak kell lennie." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const user = await db.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "A visszaállító link érvénytelen vagy lejárt." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
        passwordResetUsedAt: now,
      },
    });

    return NextResponse.json({ message: "A jelszó sikeresen módosítva." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "Hiba történt a jelszó visszaállítása közben." },
      { status: 500 }
    );
  }
}
