import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAuthorizedCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorizedCron(req)) {
      return NextResponse.json({ message: "Nincs jogosultság." }, { status: 401 });
    }

    const autoCloseThreshold = new Date(Date.now() + 120 * 60 * 1000);

    const result = await prisma.event.updateMany({
      where: {
        status: { in: ["OPEN", "NYITOTT"] },
        kickoffTime: { lte: autoCloseThreshold },
      },
      data: {
        status: "CLOSED",
      },
    });

    return NextResponse.json({
      message: "Automatikus esemény lezárás lefutott.",
      closedCount: result.count,
      thresholdUtc: autoCloseThreshold.toISOString(),
    });
  } catch (err) {
    console.error("Auto-close cron error:", err);
    return NextResponse.json({ message: "Hiba az automatikus lezárás közben." }, { status: 500 });
  }
}
