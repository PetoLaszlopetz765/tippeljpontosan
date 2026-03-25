import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { createFullBackupWorkbookBuffer } from "@/lib/backupWorkbook";

export async function GET(req: NextRequest) {
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

    const fileBuffer = await createFullBackupWorkbookBuffer();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `sportfogadas-backup-${timestamp}.xlsx`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Admin export error:", err);
    return NextResponse.json({ message: "Hiba export közben" }, { status: 500 });
  }
}
