import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const [guilds] = await pool.execute(
      `SELECT
          g.guild_id,
          g.guild_name,
          g.guild_tag,
          g.leader_id,
          g.treasury,
          p.username AS leader_name,
          COUNT(gm.player_id) AS member_count
       FROM guild g
       JOIN player p ON p.player_id = g.leader_id
       LEFT JOIN guild_membership gm ON gm.guild_id = g.guild_id
       WHERE (
         g.guild_name LIKE ?
         OR g.guild_tag LIKE ?
         OR p.username LIKE ?
       )
       GROUP BY
         g.guild_id, g.guild_name, g.guild_tag,
         g.leader_id, g.treasury, p.username
       ORDER BY g.guild_name`,
      [`%${search}%`, `%${search}%`, `%${search}%`]
    );

    const [players] = await pool.execute(
      `SELECT player_id, username
       FROM player
       WHERE status = 'ACTIVE'
       ORDER BY username`
    );

    return Response.json({
      success: true,
      guilds,
      players,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to fetch guilds" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  const connection = await pool.getConnection();

  try {
    const body = await request.json();
    const { guild_name, guild_tag, leader_id, treasury } = body;

    const leaderId = Number(leader_id);
    const treasuryValue = Number(treasury);

    if (
      !guild_name?.trim() ||
      guild_name.trim().length > 32 ||
      !guild_tag ||
      guild_tag.trim().length !== 4 ||
      !Number.isInteger(leaderId) ||
      leaderId <= 0 ||
      !Number.isFinite(treasuryValue) ||
      treasuryValue < 0 ||
      treasuryValue > 9999999999.99
    ) {
      return Response.json(
        { success: false, message: "Please provide valid guild information" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [players] = await connection.execute(
      "SELECT player_id FROM player WHERE player_id = ? AND status = 'ACTIVE'",
      [leaderId]
    );

    if (players.length === 0) {
      await connection.rollback();

      return Response.json(
        { success: false, message: "Selected leader does not exist or is inactive" },
        { status: 400 }
      );
    }

    const [memberships] = await connection.execute(
      "SELECT guild_id FROM guild_membership WHERE player_id = ?",
      [leaderId]
    );

    if (memberships.length > 0) {
      await connection.rollback();

      return Response.json(
        { success: false, message: "This player already belongs to a guild" },
        { status: 409 }
      );
    }

    const [result] = await connection.execute(
      `INSERT INTO guild (guild_name, guild_tag, leader_id, treasury)
       VALUES (?, ?, NULL, ?)`,
      [
        guild_name.trim(),
        guild_tag.trim().toUpperCase(),
        treasuryValue,
      ]
    );

    await connection.execute(
      `INSERT INTO guild_membership (guild_id, player_id, guild_role)
       VALUES (?, ?, 'LEADER')`,
      [result.insertId, leaderId]
    );

    await connection.execute("UPDATE guild SET leader_id = ? WHERE guild_id = ?", [leaderId, result.insertId]);

    await connection.commit();

    return Response.json(
      {
        success: true,
        message: "Guild created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);

    await connection.rollback();
    if (ValidationError) return ValidationError;
    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Guild name or tag already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to create guild" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
