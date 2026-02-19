import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    import { getTokenFromRequest } from "@/lib/auth";
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }
    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin módosíthat kreditet!" }, { status: 403 });
    }
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ message: "Érvénytelen vagy hiányzó user ID!" }, { status: 400 });
    }
    const userId = Number(id);
    const { newCredit } = await req.json();
    if (typeof newCredit !== "number" || isNaN(newCredit) || newCredit < 0) {
      return NextResponse.json({ message: "Érvénytelen összeg!" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ message: "Felhasználó nem található" }, { status: 404 });
    await prisma.user.update({ where: { id: userId }, data: { credits: newCredit } });
    return NextResponse.json({ message: `Kredit módosítva: ${newCredit} kredit`, credits: newCredit });
  } catch (err) {
    return NextResponse.json({ message: `Hiba: ${err instanceof Error ? err.message : String(err)}` }, { status: 500 });
  }
}
