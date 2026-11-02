import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import pool from "@/lib/db";
import { ValidateRequest } from "@/lib/security";

const SessionCookie = "arena_session";
const SessionSeconds = 60 * 60 * 8;

export function HashToken(Value) {
  return createHash("sha256").update(Value).digest("hex");
}

export async function GetSession() {
  const CookieStore = await cookies();
  const Token = CookieStore.get(SessionCookie)?.value;

  if (!Token || !/^[a-f0-9]{64}$/.test(Token)) return null;

  const [Players] = await pool.execute(
    `SELECT p.player_id, p.username, p.role
     FROM app_session s
     JOIN player p ON p.player_id = s.player_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
       AND p.status = 'ACTIVE' AND s.password_version = SHA2(p.password_hash, 256)`,
    [HashToken(Token)]
  );

  return Players[0] || null;
}

export async function CreateSession(Player) {
  await DeleteSession();
  const Token = randomBytes(32).toString("hex");

  await pool.execute(
    `INSERT INTO app_session (token_hash, player_id, password_version, expires_at)
     VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 8 HOUR))`,
    [HashToken(Token), Player.player_id, HashToken(Player.password_hash)]
  );

  const CookieStore = await cookies();
  CookieStore.set(SessionCookie, Token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SessionSeconds,
  });
}

export async function DeleteSession() {
  const CookieStore = await cookies();
  const Token = CookieStore.get(SessionCookie)?.value;
  if (Token) {
    await pool.execute("DELETE FROM app_session WHERE token_hash = ?", [HashToken(Token)]);
  }
  CookieStore.set(SessionCookie, "", {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: 0,
  });
}

export async function RequireAdmin(Request) {
  try {
    const Player = await GetSession();
    if (!Player) {
      return Response.json({ success: false, message: "Please sign in" }, { status: 401 });
    }
    if (Player.role !== "ADMIN") {
      return Response.json({ success: false, message: "Admin access required" }, { status: 403 });
    }
    return await ValidateRequest(Request);
  } catch {
    return Response.json({ success: false, message: "Authentication unavailable" }, { status: 503 });
  }
}
