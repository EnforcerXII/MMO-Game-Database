import pool from "@/lib/db";
import { createHash } from "node:crypto";

const StringFields = new Set([
  "username", "email", "password", "date_of_birth", "status", "role",
  "guild_name", "guild_tag", "item_kind", "item_name", "rarity", "slot_type",
  "mode_code", "achievement_code", "title",
]);

export async function ValidateRequest(Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(Request.method)) return null;
  const ExpectedOrigin = process.env.APP_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? new URL(Request.url).origin : null);
  if (!ExpectedOrigin || Request.headers.get("origin") !== ExpectedOrigin) {
    return Response.json({ success: false, message: "Request origin rejected" }, { status: 403 });
  }
  if (Request.method === "DELETE" || new URL(Request.url).pathname === "/api/auth/logout") return null;
  if (Request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return Response.json({ success: false, message: "JSON content required" }, { status: 415 });
  }

  const Reader = Request.clone().body?.getReader();
  if (!Reader) return Response.json({ success: false, message: "Request body required" }, { status: 400 });
  let Size = 0;
  let Text = "";
  const Decoder = new TextDecoder();
  try {
    while (true) {
      const { done: Done, value: Value } = await Reader.read();
      if (Done) break;
      Size += Value.byteLength;
      if (Size > 16384) {
        void Reader.cancel();
        return Response.json({ success: false, message: "Request body too large" }, { status: 413 });
      }
      Text += Decoder.decode(Value, { stream: true });
    }
    Text += Decoder.decode();
    const Body = JSON.parse(Text);
    if (!Body || typeof Body !== "object" || Array.isArray(Body)) throw new Error();
    for (const [Key, Value] of Object.entries(Body)) {
      if (StringFields.has(Key)) {
        if (typeof Value !== "string" && !(Key === "slot_type" && Value === null)) throw new Error();
      } else if (Value !== null && !["string", "number"].includes(typeof Value)) {
        throw new Error();
      }
    }
  } catch {
    return Response.json({ success: false, message: "Invalid JSON or field types" }, { status: 400 });
  } finally { Reader.releaseLock(); }
  return null;
}

export async function AllowLogin(Username) {
  // Shared database counter survives restarts and multiple application instances.
  const Key = createHash("sha256").update(Username.trim().toLowerCase()).digest("hex");
  await pool.execute("DELETE FROM login_attempt WHERE window_start < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 MINUTE)");
  await pool.execute(
    `INSERT INTO login_attempt (username_hash, attempts, window_start)
     VALUES (?, 1, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE attempts = attempts + 1`,
    [Key]
  );
  const [Rows] = await pool.execute("SELECT attempts FROM login_attempt WHERE username_hash = ?", [Key]);
  return Rows[0].attempts <= 10;
}
