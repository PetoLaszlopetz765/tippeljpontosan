// lib/auth.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export interface TokenPayload {
  userId: number;
  role: string;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return payload;
  } catch (err) {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  // Először a header-ből próbáljuk (localStorage)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  // Majd a session cookie-ból
  const sessionToken = req.cookies.get("sessionToken")?.value;
  return sessionToken || null;
}

export function createToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
