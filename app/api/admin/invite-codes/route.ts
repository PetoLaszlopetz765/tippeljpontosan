import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";
const INVITE_EMAIL_LOG_KEY = "invite_code_email_log";

type InviteEmailLog = Record<string, { email: string; sentAt: string }>;

function parseInviteEmailLog(raw: string | null): InviteEmailLog {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as InviteEmailLog;
  } catch {
    return {};
  }
}

function generateInviteCode(length = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Nincs O, 0, I, 1
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ message: "Csak admin generálhat!" }, { status: 403 });
  }
  let code: string = "";
  let exists: boolean = true;
  // Egyedi kódot generálunk
  while (exists) {
    code = generateInviteCode();
    exists = (await prisma.inviteCode.findUnique({ where: { code } })) !== null;
  }
  await prisma.inviteCode.create({ data: { code } });
  return NextResponse.json({ code });
}

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
    return NextResponse.json({ message: "Csak admin láthatja!" }, { status: 403 });
  }
  const [codes, emailLogSetting] = await Promise.all([
    prisma.inviteCode.findMany({ orderBy: { code: "asc" } }),
    prisma.setting.findUnique({ where: { key: INVITE_EMAIL_LOG_KEY } }),
  ]);

  const emailLog = parseInviteEmailLog(emailLogSetting?.value ?? null);
  const enrichedCodes = codes.map((item) => ({
    ...item,
    sentToEmail: emailLog[item.code]?.email ?? null,
    sentAt: emailLog[item.code]?.sentAt ?? null,
  }));

  return NextResponse.json({ codes: enrichedCodes });
}
