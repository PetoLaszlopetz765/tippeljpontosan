import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getTokenFromRequest } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    // Auth check (session cookie vagy header)
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { message: "Nincs bejelentkezve" },
        { status: 401 }
      );
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    // Admin check
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Nincs jogosultságod" },
        { status: 403 }
      );
    }

    const params = await props.params;
    const userId = parseInt(params.id);

    const body = await req.json();
    const { username, role, points, password, tipsCountAdjustment, perfectCountAdjustment } = body;
    let validatedPoints: number | undefined = undefined;
    let validatedTipsCountAdjustment: number | undefined = undefined;
    let validatedPerfectCountAdjustment: number | undefined = undefined;

    if (points !== undefined) {
      const parsed = Number(points);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { message: "Érvénytelen pont érték" },
          { status: 400 }
        );
      }
      validatedPoints = Math.floor(parsed);
    }

    if (tipsCountAdjustment !== undefined) {
      const parsed = Number(tipsCountAdjustment);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { message: "Érvénytelen összes tipp korrekció" },
          { status: 400 }
        );
      }
      validatedTipsCountAdjustment = Math.trunc(parsed);
    }

    if (perfectCountAdjustment !== undefined) {
      const parsed = Number(perfectCountAdjustment);
      if (!Number.isFinite(parsed)) {
        return NextResponse.json(
          { message: "Érvénytelen telitalálat korrekció" },
          { status: 400 }
        );
      }
      validatedPerfectCountAdjustment = Math.trunc(parsed);
    }

    // Check if username is taken by another user
    if (username) {
      const existing = await prisma.user.findUnique({
        where: { username },
      });

      if (existing && existing.id !== userId) {
        return NextResponse.json(
          { message: "Ez a felhasználónév már foglalt" },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(role && { role }),
        ...(validatedPoints !== undefined && { points: validatedPoints }),
        ...(validatedTipsCountAdjustment !== undefined && { tipsCountAdjustment: validatedTipsCountAdjustment }),
        ...(validatedPerfectCountAdjustment !== undefined && { perfectCountAdjustment: validatedPerfectCountAdjustment }),
        ...(hashedPassword && { password: hashedPassword }),
      },
      select: {
        id: true,
        username: true,
        role: true,
        points: true,
        tipsCountAdjustment: true,
        perfectCountAdjustment: true,
      },
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { message: "Hiba történt" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Auth check (session cookie vagy header)
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { message: "Nincs bejelentkezve" },
        { status: 401 }
      );
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { message: "Érvénytelen token" },
        { status: 401 }
      );
    }

    // Admin check
    if (decoded.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Csak admin törölhet!" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = Number(id);
    if (!id || isNaN(userId)) {
      return NextResponse.json({ message: "Érvénytelen vagy hiányzó user ID" }, { status: 400 });
    }

    // Delete user's bets first (cascade)
    await prisma.bet.deleteMany({
      where: { userId },
    });

    // Delete user
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: "Felhasználó és tippjei törölve." });
  } catch (err) {
    console.error("Delete user error:", err);
    return NextResponse.json(
      { message: "Hiba a törlés során." },
      { status: 500 }
    );
  }
}
