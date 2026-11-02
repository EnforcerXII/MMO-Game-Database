import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { CreateSession } from "@/lib/auth";

export async function POST(Request) {
  try {
    const Body = await Request.json();
    if (typeof Body?.username !== "string" || typeof Body?.password !== "string" ||
        !Body.username.trim() || Body.username.length > 24 ||
        Body.password.length < 8 || Buffer.byteLength(Body.password, "utf8") > 72) {
      return Response.json({ success: false, message: "Invalid sign-in details" }, { status: 400 });
    }

    const [Players] = await pool.execute(
      "SELECT player_id, username, password_hash, role, status FROM player WHERE username = ?",
      [Body.username.trim()]
    );
    const Player = Players[0];
    // Do comparable password work even for unknown usernames.
    const FallbackHash = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const Valid = await bcrypt.compare(Body.password, Player?.password_hash || FallbackHash);

    if (!Player || !Valid || Player.status !== "ACTIVE") {
      return Response.json({ success: false, message: "Invalid username or password" }, { status: 401 });
    }

    await CreateSession(Player);
    return Response.json({ success: true, role: Player.role });
  } catch (Error) {
    return Response.json(
      { success: false, message: Error instanceof SyntaxError ? "Invalid JSON" : "Sign-in unavailable" },
      { status: Error instanceof SyntaxError ? 400 : 503 }
    );
  }
}
