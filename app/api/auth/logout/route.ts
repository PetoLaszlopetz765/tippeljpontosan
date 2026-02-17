import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ message: "Sikeresen kijelentkeztél" });
    
    // Session cookie törlése
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Azonnal lejár
      path: "/"
    });

    return response;
  } catch (err) {
    console.error("❌ Logout error:", err);
    return NextResponse.json(
      { message: "Hiba történt a kijelentkezéskor" },
      { status: 500 }
    );
  }
}
