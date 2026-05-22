import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function GET() {
  // Lekérdezi az aktuális kezdő kreditet
  const setting = await prisma.setting.findUnique({ where: { key: "initial_credits" } });
  return NextResponse.json({ initialCredits: setting ? Number(setting.value) : 4000 });
}

export async function POST(req: NextRequest) {
  // Csak admin módosíthatja
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
    return NextResponse.json({ message: "Csak admin módosíthatja!" }, { status: 403 });
  }
  const { value } = await req.json();
  if (typeof value !== "number" || isNaN(value) || value < 0) {
    return NextResponse.json({ message: "Érvénytelen érték!" }, { status: 400 });
  }
  await prisma.setting.upsert({
    where: { key: "initial_credits" },
    update: { value: String(value) },
    create: { key: "initial_credits", value: String(value) },
  });
  return NextResponse.json({ message: `Kezdő kredit beállítva: ${value}` });
}
