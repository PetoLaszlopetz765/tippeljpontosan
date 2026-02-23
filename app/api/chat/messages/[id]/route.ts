import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

type ParsedReply = {
  replyToMessageId: number;
  replyToUsername: string;
} | null;

function parseStoredText(storedText: string): { parsedReply: ParsedReply; text: string } {
  const match = storedText.match(/^\[\[reply:(\d+):([^\]]+)\]\]\s*/);
  if (!match) {
    return { parsedReply: null, text: storedText };
  }

  const replyToMessageId = Number(match[1]);
  const replyToUsername = match[2];
  const text = storedText.replace(/^\[\[reply:(\d+):([^\]]+)\]\]\s*/, "");

  if (!Number.isFinite(replyToMessageId)) {
    return { parsedReply: null, text: storedText };
  }

  return {
    parsedReply: {
      replyToMessageId,
      replyToUsername,
    },
    text,
  };
}

function buildStoredText(text: string, parsedReply: ParsedReply): string {
  if (!parsedReply?.replyToMessageId || !parsedReply.replyToUsername) {
    return text;
  }

  return `[[reply:${parsedReply.replyToMessageId}:${parsedReply.replyToUsername}]] ${text}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const resolvedParams = await params;
    const messageId = Number(resolvedParams.id);

    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ message: "Érvénytelen üzenet azonosító" }, { status: 400 });
    }

    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text : "";
    const text = rawText.trim();

    if (!text) {
      return NextResponse.json({ message: "Az üzenet nem lehet üres" }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ message: "Az üzenet túl hosszú (max 500 karakter)" }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!existing || existing.deleted) {
      return NextResponse.json({ message: "Az üzenet nem található" }, { status: 404 });
    }

    if (existing.userId !== payload.userId) {
      return NextResponse.json({ message: "Csak a saját üzenetedet szerkesztheted" }, { status: 403 });
    }

    const parsed = parseStoredText(existing.text);
    const updatedText = buildStoredText(text, parsed.parsedReply);

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        text: updatedText,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    const updatedParsed = parseStoredText(updated.text);

    return NextResponse.json({
      id: updated.id,
      userId: updated.userId,
      text: updatedParsed.text,
      createdAt: updated.createdAt,
      user: updated.user,
      replyToMessageId: updatedParsed.parsedReply?.replyToMessageId ?? null,
      replyToUsername: updatedParsed.parsedReply?.replyToUsername ?? null,
    });
  } catch (error) {
    console.error("Chat PATCH hiba:", error);
    return NextResponse.json({ message: "Hiba az üzenet szerkesztésekor" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const resolvedParams = await params;
    const messageId = Number(resolvedParams.id);

    if (!Number.isFinite(messageId)) {
      return NextResponse.json({ message: "Érvénytelen üzenet azonosító" }, { status: 400 });
    }

    const existing = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        userId: true,
        deleted: true,
      },
    });

    if (!existing || existing.deleted) {
      return NextResponse.json({ message: "Az üzenet nem található" }, { status: 404 });
    }

    const isOwner = existing.userId === payload.userId;
    const isAdmin = payload.role?.toUpperCase() === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ message: "Nincs jogosultságod az üzenet törléséhez" }, { status: 403 });
    }

    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deleted: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat DELETE hiba:", error);
    return NextResponse.json({ message: "Hiba az üzenet törlésekor" }, { status: 500 });
  }
}
