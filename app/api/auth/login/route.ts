import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcrypt";
import { createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    console.log("🔐 LOGIN ATTEMPT:", { username });

    if (!username || !password) {
      console.log("❌ Missing username or password");
      return NextResponse.json(
        { message: "Hiányzó felhasználónév vagy jelszó" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    console.log("🔍 User found:", user ? `✓ ${user.username}` : "❌ Not found");

    if (!user) {
      console.log("❌ User not found in database");
      return NextResponse.json(
        { message: "Hibás adatok" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);

    console.log("🔑 Password match:", valid ? "✓ Valid" : "❌ Invalid");

    if (!valid) {
      console.log("❌ Password invalid");
      return NextResponse.json(
        { message: "Hibás adatok" },
        { status: 400 }
      );
    }

    const token = createToken(user.id, user.role);

    console.log("✅ Login successful:", { userId: user.id, username: user.username, role: user.role });

    return NextResponse.json({ token, userId: user.id, role: user.role, username: user.username });
  } catch (err) {
    console.error("❌ Login error:", err);
    return NextResponse.json(
      { message: "Hiba történt a bejelentkezéskor" },
      { status: 500 }
    );
  }
}
