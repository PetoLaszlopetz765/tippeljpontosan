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

function buildStoredText(text: string, replyToMessageId?: number, replyToUsername?: string): string {
  if (!replyToMessageId || !replyToUsername) {
    return text;
  }

  return `[[reply:${replyToMessageId}:${replyToUsername}]] ${text}`;
}

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

    const messages = await prisma.chatMessage.findMany({
      where: { deleted: false },
      orderBy: { createdAt: "asc" },
      take: 200,
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

    const formatted = messages.map((message) => {
      const { parsedReply, text } = parseStoredText(message.text);

      return {
        id: message.id,
        userId: message.userId,
        text,
        createdAt: message.createdAt,
        user: message.user,
        replyToMessageId: parsedReply?.replyToMessageId ?? null,
        replyToUsername: parsedReply?.replyToUsername ?? null,
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Chat GET hiba:", error);
    return NextResponse.json({ message: "Hiba az üzenetek lekérésekor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ message: "Nincs token" }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Érvénytelen token" }, { status: 401 });
    }

    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text : "";
    const text = rawText.trim();
    const replyToMessageId =
      typeof body?.replyToMessageId === "number" ? body.replyToMessageId : undefined;

    if (!text) {
      return NextResponse.json({ message: "Az üzenet nem lehet üres" }, { status: 400 });
    }

    if (text.length > 500) {
      return NextResponse.json({ message: "Az üzenet túl hosszú (max 500 karakter)" }, { status: 400 });
    }

    let replyToUsername: string | undefined;

    if (replyToMessageId) {
      const replyTarget = await prisma.chatMessage.findFirst({
        where: { id: replyToMessageId, deleted: false },
        include: { user: { select: { username: true } } },
      });

      if (!replyTarget) {
        return NextResponse.json({ message: "A válaszolt üzenet nem található" }, { status: 404 });
      }

      replyToUsername = replyTarget.user.username.replace(/[:\]]/g, "");
    }

    const storedText = buildStoredText(text, replyToMessageId, replyToUsername);

    const created = await prisma.chatMessage.create({
      data: {
        userId: payload.userId,
        text: storedText,
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

    const parsed = parseStoredText(created.text);

    return NextResponse.json(
      {
        id: created.id,
        userId: created.userId,
        text: parsed.text,
        createdAt: created.createdAt,
        user: created.user,
        replyToMessageId: parsed.parsedReply?.replyToMessageId ?? null,
        replyToUsername: parsed.parsedReply?.replyToUsername ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Chat POST hiba:", error);
    return NextResponse.json({ message: "Hiba az üzenet küldésekor" }, { status: 500 });
  }
}
