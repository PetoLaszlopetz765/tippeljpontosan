import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { chatLastReadAt: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Felhasználó nem található" }, { status: 404 });
    }

    const unreadCount = await prisma.chatMessage.count({
      where: {
        deleted: false,
        userId: { not: payload.userId },
        ...(user.chatLastReadAt ? { createdAt: { gt: user.chatLastReadAt } } : {}),
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error("Unread count GET hiba:", error);
    return NextResponse.json({ message: "Hiba az olvasatlan üzenetszám lekérésekor" }, { status: 500 });
  }
}
