import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const queries = [
      ["players", "SELECT COUNT(*) AS total FROM player"],
      ["guilds", "SELECT COUNT(*) AS total FROM guild"],
      ["matches", "SELECT COUNT(*) AS total FROM game_match"],
      ["items", "SELECT COUNT(*) AS total FROM item"],
      ["achievements", "SELECT COUNT(*) AS total FROM achievement"],
    ];

    const stats = {};

    for (const [key, query] of queries) {
      const [rows] = await pool.query(query);
      stats[key] = rows[0].total;
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
