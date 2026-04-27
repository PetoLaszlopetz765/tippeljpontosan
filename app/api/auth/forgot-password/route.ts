import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/gmail";

function getAppUrl() {
  const normalizeUrl = (value: string) => (value.startsWith("http") ? value : `https://${value}`);

  const isLocalhostUrl = (value: string) => {
    try {
      const parsed = new URL(normalizeUrl(value));
      return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };

  const isProd = process.env.NODE_ENV === "production";

  const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (explicitAppUrl && (!isProd || !isLocalhostUrl(explicitAppUrl))) {
    return normalizeUrl(explicitAppUrl);
  }

  const vercelProdDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProdDomain) {
    return normalizeUrl(vercelProdDomain);
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return normalizeUrl(vercelUrl);
  }

  return "https://tippeljpontosan.vercel.app";
}

function genericResponse() {
  return NextResponse.json({
    message: "Ha létezik fiók ezzel az email címmel, elküldtük a jelszó-visszaállító linket.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const db = prisma as any;
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return genericResponse();
    }

    const user = await db.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordResetRequestedAt: true,
      },
    });

    if (!user || !user.email) {
      return genericResponse();
    }

    // Basic anti-spam cooldown: same user can request a new email every 60 seconds.
    const now = new Date();
    if (
      user.passwordResetRequestedAt &&
      now.getTime() - new Date(user.passwordResetRequestedAt).getTime() < 60_000
    ) {
      return genericResponse();
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
        passwordResetRequestedAt: now,
        passwordResetUsedAt: null,
      },
    });

    const appUrl = getAppUrl().replace(/\/$/, "");
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      appUrl,
    });

    return genericResponse();
  } catch (error) {
    console.error("Forgot password error:", error);
    return genericResponse();
  }
}
