import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    let sql = `
      SELECT
        gm.match_id,
        gm.mode_code,
        gm.season_id,
        gm.started_at,
        gm.ended_at,
        gm.status,
        mode.mode_name,
        season.season_name,
        COUNT(DISTINCT mp.player_id) AS participant_count,
        COUNT(DISTINCT mr.round_no) AS round_count
      FROM game_match gm
      JOIN game_mode mode ON mode.mode_code = gm.mode_code
      JOIN season ON season.season_id = gm.season_id
      LEFT JOIN match_participation mp ON mp.match_id = gm.match_id
      LEFT JOIN match_round mr ON mr.match_id = gm.match_id
      WHERE (
        mode.mode_name LIKE ?
        OR mode.mode_code LIKE ?
        OR season.season_name LIKE ?
      )
    `;

    const params = [`%${search}%`, `%${search}%`, `%${search}%`];

    if (["LIVE", "COMPLETED", "ABANDONED"].includes(status)) {
      sql += " AND gm.status = ?";
      params.push(status);
    }

    sql += `
      GROUP BY
        gm.match_id, gm.mode_code, gm.season_id,
        gm.started_at, gm.ended_at, gm.status,
        mode.mode_name, season.season_name
      ORDER BY gm.started_at DESC
    `;

    const [matches] = await pool.execute(sql, params);

    const [modes] = await pool.execute(
      "SELECT mode_code, mode_name, team_size FROM game_mode ORDER BY mode_name"
    );

    const [seasons] = await pool.execute(
      "SELECT season_id, season_name FROM season ORDER BY start_date DESC"
    );

    return Response.json({
      success: true,
      matches,
      modes,
      seasons,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Matches GET error:", error);

    return Response.json(
      { success: false, message: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const body = await request.json();

    const modeCode = body.mode_code;
    const seasonId = Number(body.season_id);

    if (
      !modeCode ||
      !Number.isInteger(seasonId) ||
      seasonId <= 0
    ) {
      return Response.json(
        { success: false, message: "Select a valid game mode and season" },
        { status: 400 }
      );
    }

    const [modes] = await pool.execute(
      "SELECT mode_code FROM game_mode WHERE mode_code = ?",
      [modeCode]
    );

    const [seasons] = await pool.execute(
      "SELECT season_id FROM season WHERE season_id = ?",
      [seasonId]
    );

    if (modes.length === 0 || seasons.length === 0) {
      return Response.json(
        { success: false, message: "Selected game mode or season does not exist" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO game_match (mode_code, season_id)
       VALUES (?, ?)`,
      [modeCode, seasonId]
    );

    return Response.json(
      {
        success: true,
        message: "Match created successfully",
        match_id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Matches POST error:", error);

    return Response.json(
      { success: false, message: "Failed to create match" },
      { status: 500 }
    );
  }
}
