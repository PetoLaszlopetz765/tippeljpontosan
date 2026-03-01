import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    console.log("=== DELETE EVENT ENDPOINT CALLED ===");
    
    const params = await props.params;
    const eventId = parseInt(params.id);
    
    console.log("Event ID:", eventId);
    
    // Auth ellenőrzés
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No auth header");
      return NextResponse.json(
        { message: "Nincs token - csak adminok tudnak eseményt törölni" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log("✓ Token verified:", decoded);
    } catch (err) {
      console.log("❌ Token verification failed:", err);
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Csak admin törölhet eseményt" },
        { status: 403 }
      );
    }

    const deletedBetsCount = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error("EVENT_NOT_FOUND");
      }

      const allBets = await tx.bet.findMany({
        where: { eventId },
      });

      console.log(`Found ${allBets.length} bets for this event`);

      const refundByUser = new Map<number, number>();
      for (const bet of allBets) {
        refundByUser.set(bet.userId, (refundByUser.get(bet.userId) || 0) + (bet.creditSpent || 0));
      }

      const userIds = Array.from(refundByUser.keys());

      const [affectedUsersBefore, basePointsBeforeByUser] = await Promise.all([
        tx.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, points: true },
        }),
        tx.bet.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _sum: { pointsAwarded: true },
        }),
      ]);

      const baseBeforeMap = new Map<number, number>(
        basePointsBeforeByUser.map((row) => [row.userId, row._sum.pointsAwarded || 0])
      );

      const pointsAdjustmentByUser = new Map<number, number>(
        affectedUsersBefore.map((user) => [user.id, user.points - (baseBeforeMap.get(user.id) || 0)])
      );

      await tx.bet.deleteMany({
        where: { eventId },
      });

      await tx.dailyPool.deleteMany({
        where: { eventId },
      });

      await tx.event.delete({
        where: { id: eventId },
      });

      const basePointsAfterByUser = await tx.bet.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _sum: { pointsAwarded: true },
      });

      const baseAfterMap = new Map<number, number>(
        basePointsAfterByUser.map((row) => [row.userId, row._sum.pointsAwarded || 0])
      );

      for (const userId of userIds) {
        await tx.user.update({
          where: { id: userId },
          data: {
            points: Math.max(
              0,
              (baseAfterMap.get(userId) || 0) + (pointsAdjustmentByUser.get(userId) || 0)
            ),
            credits: { increment: refundByUser.get(userId) || 0 },
          },
        });
      }

      return allBets.length;
    });

    console.log("✓ Event deleted:", eventId);

    return NextResponse.json({
      message: `Esemény és ${deletedBetsCount} tipp sikeresen törölve`,
      deletedBetsCount,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "EVENT_NOT_FOUND") {
      return NextResponse.json(
        { message: "Esemény nem található" },
        { status: 404 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { message: "Hiba az esemény törlésekor" },
      { status: 500 }
    );
  }
}
