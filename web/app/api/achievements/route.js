import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const [achievements] = await pool.execute(
      `SELECT
         a.achievement_code,
         a.title,
         a.points,
         COUNT(DISTINCT pa.player_id) AS players_unlocked
       FROM achievement a
       LEFT JOIN player_achievement pa
         ON pa.achievement_code = a.achievement_code
       WHERE a.title LIKE ? OR a.achievement_code LIKE ?
       GROUP BY a.achievement_code, a.title, a.points
       ORDER BY a.achievement_code`,
      [`%${search}%`, `%${search}%`]
    );

    return Response.json({ success: true, achievements });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const body = await request.json();

    const code = body.achievement_code?.trim();
    const title = body.title?.trim();
    const points = Number(body.points);

    if (
      !code ||
      code.length > 24 ||
      !title ||
      title.length > 60 ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 32767
    ) {
      return Response.json(
        { success: false, message: "Invalid achievement information" },
        { status: 400 }
      );
    }

    await pool.execute(
      `INSERT INTO achievement
       (achievement_code, title, points)
       VALUES (?, ?, ?)`,
      [code, title, points]
    );

    return Response.json(
      { success: true, message: "Achievement created successfully" },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        {
          success: false,
          message: "Achievement code or title already exists",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to create achievement" },
      { status: 500 }
    );
  }
}
