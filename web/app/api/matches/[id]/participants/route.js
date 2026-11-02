import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request, { params }) {
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

    const [matches] = await pool.execute(
      "SELECT match_id FROM game_match WHERE match_id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      return Response.json(
        { success: false, message: "Match not found" },
        { status: 404 }
      );
    }

    const [participants] = await pool.execute(
      `SELECT
        mp.player_id,
        p.username,
        mp.team_no,
        mp.kills,
        mp.deaths,
        mp.damage_dealt
       FROM match_participation mp
       JOIN player p ON p.player_id = mp.player_id
       WHERE mp.match_id = ?
       ORDER BY mp.team_no, mp.kills DESC`,
      [matchId]
    );

    const [players] = await pool.execute(
      `SELECT p.player_id, p.username
       FROM player p
       WHERE p.status = 'ACTIVE'
       AND NOT EXISTS (
         SELECT 1
         FROM match_participation mp
         WHERE mp.match_id = ?
           AND mp.player_id = p.player_id
       )
       ORDER BY p.username`,
      [matchId]
    );

    return Response.json({
      success: true,
      participants,
      players,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to fetch participants" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const matchId = Number(id);
    const body = await request.json();

    const playerId = Number(body.player_id);
    const teamNo = Number(body.team_no);

    if (
      !Number.isInteger(matchId) ||
      matchId <= 0 ||
      !Number.isInteger(playerId) ||
      playerId <= 0 ||
      !Number.isInteger(teamNo) ||
      teamNo < 1 ||
      teamNo > 32767
    ) {
      return Response.json(
        { success: false, message: "Invalid participant information" },
        { status: 400 }
      );
    }

    const [matches] = await pool.execute(
      "SELECT match_id FROM game_match WHERE match_id = ?",
      [matchId]
    );

    if (matches.length === 0) {
      return Response.json(
        { success: false, message: "Match not found" },
        { status: 404 }
      );
    }

    const [players] = await pool.execute(
      "SELECT player_id FROM player WHERE player_id = ? AND status = 'ACTIVE'",
      [playerId]
    );

    if (players.length === 0) {
      return Response.json(
        { success: false, message: "Player not found or inactive" },
        { status: 404 }
      );
    }

    await pool.execute(
      `INSERT INTO match_participation
        (match_id, player_id, team_no)
       VALUES (?, ?, ?)`,
      [matchId, playerId, teamNo]
    );

    return Response.json(
      { success: true, message: "Participant added successfully" },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Player is already in this match" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to add participant" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const matchId = Number(id);
    const body = await request.json();

    const playerId = Number(body.player_id);
    const teamNo = Number(body.team_no);
    const kills = Number(body.kills);
    const deaths = Number(body.deaths);
    const damage = Number(body.damage_dealt);

    if (
      !Number.isInteger(matchId) || matchId <= 0 ||
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(teamNo) || teamNo < 1 || teamNo > 32767 ||
      !Number.isInteger(kills) || kills < 0 || kills > 32767 ||
      !Number.isInteger(deaths) || deaths < 0 || deaths > 32767 ||
      !Number.isInteger(damage) || damage < 0 || damage > 2147483647
    ) {
      return Response.json(
        { success: false, message: "Invalid participant statistics" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE match_participation
       SET team_no = ?, kills = ?, deaths = ?, damage_dealt = ?
       WHERE match_id = ? AND player_id = ?`,
      [teamNo, kills, deaths, damage, matchId, playerId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        `SELECT player_id FROM match_participation
         WHERE match_id = ? AND player_id = ?`,
        [matchId, playerId]
      );

      if (existing.length === 0) {
        return Response.json(
          { success: false, message: "Participant not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Participant statistics updated",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to update participant" },
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
    const { searchParams } = new URL(request.url);
    const playerId = Number(searchParams.get("player_id"));

    if (
      !Number.isInteger(matchId) || matchId <= 0 ||
      !Number.isInteger(playerId) || playerId <= 0
    ) {
      return Response.json(
        { success: false, message: "Invalid match or player ID" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `DELETE FROM match_participation
       WHERE match_id = ? AND player_id = ?`,
      [matchId, playerId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Participant not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Participant removed successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to remove participant" },
      { status: 500 }
    );
  }
}
