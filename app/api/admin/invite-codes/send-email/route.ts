import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";
import { sendInviteCodeEmail } from "@/lib/gmail";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAppUrl() {
  const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (explicitAppUrl) {
    return explicitAppUrl;
  }

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!vercelDomain) {
    return undefined;
  }

  return vercelDomain.startsWith("http") ? vercelDomain : `https://${vercelDomain}`;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin küldhet meghívót!" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const code = String(body?.code || "").trim().toUpperCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: "Adj meg egy érvényes email címet." }, { status: 400 });
    }

    if (!code) {
      return NextResponse.json({ message: "Hiányzó meghívó kód." }, { status: 400 });
    }

    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) {
      return NextResponse.json({ message: "A meghívó kód nem található." }, { status: 404 });
    }

    if (invite.used) {
      return NextResponse.json({ message: "Ez a meghívó kód már felhasznált." }, { status: 400 });
    }

    await sendInviteCodeEmail({
      to: email,
      inviteCode: invite.code,
      appUrl: getAppUrl(),
    });

    return NextResponse.json({
      message: `Meghívó kód elküldve: ${email}`,
      code: invite.code,
    });
  } catch (err: any) {
    const apiStatus = Number(err?.response?.status) || 500;
    const apiMessage =
      err?.response?.data?.error?.message ||
      err?.response?.data?.error_description ||
      err?.message ||
      "Ismeretlen hiba";

    return NextResponse.json(
      { message: `Hiba az email küldés közben: ${apiMessage}` },
      { status: apiStatus >= 400 && apiStatus < 600 ? apiStatus : 500 }
    );
  }
}
