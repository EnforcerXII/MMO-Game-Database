import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const guildId = Number(id);

    if (!Number.isInteger(guildId) || guildId <= 0) {
      return Response.json(
        { success: false, message: "Invalid guild ID" },
        { status: 400 }
      );
    }

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
        { success: false, message: "Invalid guild information" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [guilds] = await connection.execute(
      "SELECT leader_id FROM guild WHERE guild_id = ? FOR UPDATE",
      [guildId]
    );

    if (guilds.length === 0) {
      await connection.rollback();

      return Response.json(
        { success: false, message: "Guild not found" },
        { status: 404 }
      );
    }

    const oldLeaderId = Number(guilds[0].leader_id);

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
      `SELECT guild_id
       FROM guild_membership
       WHERE player_id = ? AND guild_id <> ?`,
      [leaderId, guildId]
    );

    if (memberships.length > 0) {
      await connection.rollback();

      return Response.json(
        { success: false, message: "This player already belongs to another guild" },
        { status: 409 }
      );
    }

    await connection.execute(
      `INSERT INTO guild_membership (guild_id, player_id, guild_role)
       VALUES (?, ?, 'LEADER')
       ON DUPLICATE KEY UPDATE guild_role = 'LEADER'`,
      [guildId, leaderId]
    );

    await connection.execute(
      `UPDATE guild
       SET guild_name = ?, guild_tag = ?, leader_id = ?, treasury = ?
       WHERE guild_id = ?`,
      [
        guild_name.trim(),
        guild_tag.trim().toUpperCase(),
        leaderId,
        treasuryValue,
        guildId,
      ]
    );

    if (oldLeaderId !== leaderId) {
      await connection.execute(
        `UPDATE guild_membership
         SET guild_role = 'MEMBER'
         WHERE guild_id = ? AND player_id = ?`,
        [guildId, oldLeaderId]
      );
    }



    await connection.commit();

    return Response.json({
      success: true,
      message: "Guild updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);

    await connection.rollback();
    if (ValidationError) return ValidationError;
    console.error("Guilds PATCH error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Guild name or tag already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to update guild" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const guildId = Number(id);

    if (!Number.isInteger(guildId) || guildId <= 0) {
      return Response.json(
        { success: false, message: "Invalid guild ID" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [guilds] = await connection.execute(
      "SELECT guild_id FROM guild WHERE guild_id = ?",
      [guildId]
    );

    if (guilds.length === 0) {
      await connection.rollback();

      return Response.json(
        { success: false, message: "Guild not found" },
        { status: 404 }
      );
    }

    await connection.execute(
      "UPDATE guild SET leader_id = NULL WHERE guild_id = ?",
      [guildId]
    );

    await connection.execute(
      "DELETE FROM guild WHERE guild_id = ?",
      [guildId]
    );

    await connection.commit();

    return Response.json({
      success: true,
      message: "Guild deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);

    await connection.rollback();
    if (ValidationError) return ValidationError;
    console.error("Guilds DELETE error:", error);

    return Response.json(
      {
        success: false,
        message: "Guild could not be deleted because another record references it.",
      },
      { status: 409 }
    );
  } finally {
    connection.release();
  }
}
