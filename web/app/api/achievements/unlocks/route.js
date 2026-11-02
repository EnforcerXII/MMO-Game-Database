import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = Number(searchParams.get("player_id"));

    const [players] = await pool.execute(
      `SELECT player_id, username
       FROM player
       WHERE status = 'ACTIVE'
       ORDER BY username`
    );

    const [achievements] = await pool.execute(
      `SELECT achievement_code, title, points
       FROM achievement
       ORDER BY title`
    );

    const [matches] = await pool.execute(
      `SELECT match_id, mode_code, status
       FROM game_match
       ORDER BY started_at DESC`
    );

    let unlocks = [];
    let totalPoints = 0;

    if (Number.isInteger(playerId) && playerId > 0) {
      const [rows] = await pool.execute(
        `SELECT
           pa.player_id,
           pa.achievement_code,
           pa.match_id,
           pa.unlocked_at,
           a.title,
           a.points,
           gm.mode_code,
           p.username
         FROM player_achievement pa
         JOIN achievement a
           ON a.achievement_code = pa.achievement_code
         JOIN game_match gm
           ON gm.match_id = pa.match_id
         JOIN player p
           ON p.player_id = pa.player_id
         WHERE pa.player_id = ?
         ORDER BY pa.unlocked_at DESC`,
        [playerId]
      );

      unlocks = rows;
      totalPoints = rows.reduce(
        (sum, row) => sum + Number(row.points),
        0
      );
    }

    return Response.json({
      success: true,
      players,
      achievements,
      matches,
      unlocks,
      totalPoints,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);

    return Response.json(
      { success: false, message: "Failed to fetch player achievements" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const body = await request.json();

    const playerId = Number(body.player_id);
    const matchId = Number(body.match_id);
    const achievementCode = body.achievement_code;

    if (
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(matchId) || matchId <= 0 ||
      typeof achievementCode !== "string" ||
      !achievementCode.trim()
    ) {
      return Response.json(
        { success: false, message: "Invalid achievement assignment" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO player_achievement
       (player_id, achievement_code, match_id)
       SELECT ?, ?, ?
       WHERE EXISTS (
         SELECT 1
         FROM match_participation
         WHERE player_id = ? AND match_id = ?
       )
       AND EXISTS (
         SELECT 1
         FROM achievement
         WHERE achievement_code = ?
       )`,
      [
        playerId,
        achievementCode,
        matchId,
        playerId,
        matchId,
        achievementCode,
      ]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid player, match, or achievement. The player must have participated in the selected match.",
        },
        { status: 400 }
      );
    }

    return Response.json(
      { success: true, message: "Achievement awarded successfully" },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        {
          success: false,
          message: "This player already has this achievement for that match.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to award achievement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);

    const playerId = Number(searchParams.get("player_id"));
    const matchId = Number(searchParams.get("match_id"));
    const code = searchParams.get("achievement_code");

    if (
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(matchId) || matchId <= 0 ||
      !code
    ) {
      return Response.json(
        { success: false, message: "Invalid achievement assignment" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `DELETE FROM player_achievement
       WHERE player_id = ?
         AND match_id = ?
         AND achievement_code = ?`,
      [playerId, matchId, code]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Achievement assignment not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Achievement removed successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);

    return Response.json(
      { success: false, message: "Failed to remove achievement" },
      { status: 500 }
    );
  }
}
