import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { autoCloseStartedEvents } from "@/lib/eventStatus";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

async function isAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);

  // Vercel Cron hitelesites CRON_SECRET alapon
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    return true;
  }

  // Kezi futtatas admin tokennel
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: number };
    if (!decoded?.userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    return user?.role === "ADMIN";
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const allowed = await isAuthorized(req);
    if (!allowed) {
      return NextResponse.json({ message: "Nincs jogosultság" }, { status: 401 });
    }

    const closedCount = await autoCloseStartedEvents();

    return NextResponse.json({
      message: "Automatikus eseményzárás lefutott.",
      closedCount,
      executedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Auto-close error:", err);
    return NextResponse.json({ message: "Hiba az automatikus lezárás során" }, { status: 500 });
  }
}
