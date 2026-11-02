import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const matchId = Number(id);

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return Response.json(
        { success: false, message: "Invalid match ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const modeCode = body.mode_code;
    const seasonId = Number(body.season_id);
    const status = body.status;

    if (
      !modeCode ||
      !Number.isInteger(seasonId) ||
      seasonId <= 0 ||
      !["LIVE", "COMPLETED", "ABANDONED"].includes(status)
    ) {
      return Response.json(
        { success: false, message: "Invalid match information" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE game_match
       SET
         mode_code = ?,
         season_id = ?,
         status = ?,
         ended_at = CASE
           WHEN ? = 'LIVE' THEN NULL
           WHEN ended_at IS NULL THEN CURRENT_TIMESTAMP
           ELSE ended_at
         END
       WHERE match_id = ?`,
      [modeCode, seasonId, status, status, matchId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT match_id FROM game_match WHERE match_id = ?",
        [matchId]
      );

      if (existing.length === 0) {
        return Response.json(
          { success: false, message: "Match not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Match updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to update match" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const matchId = Number(id);

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return Response.json(
        { success: false, message: "Invalid match ID" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      "DELETE FROM game_match WHERE match_id = ?",
      [matchId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Match not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      {
        success: false,
        message: "Failed to delete match",
      },
      { status: 409 }
    );
  }
}
