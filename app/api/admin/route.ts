import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function GET(req: NextRequest) {
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
    return NextResponse.json({ message: "Csak admin!" }, { status: 403 });
  }
  // Opcionálisan visszaadhatunk admin infót
  return NextResponse.json({ admin: true, id: decoded.id, email: decoded.email });
}
