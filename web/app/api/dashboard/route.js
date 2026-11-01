import pool from "@/lib/db";

export async function GET() {
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
    console.error("Dashboard API error:", error);

    return Response.json(
      { success: false, message: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
