import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { google } from "googleapis";
import { Readable } from "stream";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

function buildDriveAuth() {
  const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    const oauth2Client = new google.auth.OAuth2({
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
    });

    oauth2Client.setCredentials({ refresh_token: oauthRefreshToken });
    return oauth2Client;
  }

  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    throw new Error(
      "Hiányzó Google Drive auth konfiguráció. Add meg vagy az OAuth env-eket (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN), vagy a service account env-eket (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)."
    );
  }

  return new google.auth.JWT({
    email: serviceAccountEmail,
    key: serviceAccountPrivateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token!" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ message: "Csak admin!" }, { status: 403 });
    }

    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!driveFolderId) {
      return NextResponse.json(
        { message: "Hiányzó Google Drive konfiguráció: GOOGLE_DRIVE_FOLDER_ID." },
        { status: 500 }
      );
    }

    const [settings, users, inviteCodes, events, bets, creditPools, dailyPools, chatMessages] = await Promise.all([
      prisma.setting.findMany({ orderBy: { id: "asc" } }),
      prisma.user.findMany({ orderBy: { id: "asc" } }),
      prisma.inviteCode.findMany({ orderBy: { code: "asc" } }),
      prisma.event.findMany({ orderBy: { id: "asc" } }),
      prisma.bet.findMany({ orderBy: { id: "asc" } }),
      prisma.creditPool.findMany({ orderBy: { id: "asc" } }),
      prisma.dailyPool.findMany({ orderBy: { id: "asc" } }),
      prisma.chatMessage.findMany({ orderBy: { id: "asc" } }),
    ]);

    const workbook = XLSX.utils.book_new();

    const appendSheet = (name: string, rows: Array<Record<string, unknown>>) => {
      const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ info: "Nincs adat" }]);
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };

    appendSheet("Setting", settings);
    appendSheet("User", users);
    appendSheet("InviteCode", inviteCodes);
    appendSheet("Event", events);
    appendSheet("Bet", bets);
    appendSheet("CreditPool", creditPools);
    appendSheet("DailyPool", dailyPools);
    appendSheet("ChatMessage", chatMessages);

    const fileBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `sportfogadas-backup-${timestamp}.xlsx`;

    const auth = buildDriveAuth();

    const drive = google.drive({ version: "v3", auth });

    await drive.files.get({
      fileId: driveFolderId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    });

    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [driveFolderId],
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      media: {
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: Readable.from(fileBuffer),
      },
      fields: "id,name,webViewLink,createdTime",
      supportsAllDrives: true,
    });

    return NextResponse.json({
      message: "Backup sikeresen feltöltve Google Drive-ra.",
      file: uploadResponse.data,
    });
  } catch (err: any) {
    const apiStatus = Number(err?.response?.status) || 500;
    const apiMessage =
      err?.response?.data?.error?.message ||
      err?.response?.data?.error_description ||
      err?.message ||
      "Ismeretlen hiba";

    console.error("Google Drive backup upload error:", {
      status: apiStatus,
      message: apiMessage,
      raw: err,
    });

    return NextResponse.json(
      {
        message: `Hiba a Google Drive feltöltés közben: ${apiMessage}`,
      },
      { status: apiStatus >= 400 && apiStatus < 600 ? apiStatus : 500 }
    );
  }
}
