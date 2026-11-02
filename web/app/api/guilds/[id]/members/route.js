
import { NextResponse } from "next/server";
import pool from "@/lib/db";




export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [members] = await pool.query(
      `SELECT p.player_id, p.username, gm.guild_role, gm.joined_on
       FROM guild_membership gm
       JOIN player p ON p.player_id = gm.player_id
       WHERE gm.guild_id = ?
       ORDER BY FIELD(gm.guild_role, 'LEADER', 'OFFICER', 'MEMBER'),
                p.username`,
      [id]
    );

    const [availablePlayers] = await pool.query(
      `SELECT p.player_id, p.username
       FROM player p
       LEFT JOIN guild_membership gm ON gm.player_id = p.player_id
       WHERE p.status = 'ACTIVE'
         AND gm.player_id IS NULL
       ORDER BY p.username`
    );

    return NextResponse.json({ members, availablePlayers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch guild members" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { player_id } = await request.json();

    if (!player_id) {
      return NextResponse.json(
        { error: "Player is required" },
        { status: 400 }
      );
    }

    await pool.query(
      `INSERT INTO guild_membership
       (guild_id, player_id, guild_role)
       VALUES (?, ?, 'MEMBER')`,
      [id, player_id]
    );

    return NextResponse.json(
      { message: "Player added to guild" },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "Player already belongs to a guild" },
        { status: 409 }
      );
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { error: "Guild or player does not exist" },
        { status: 404 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to add member" },
      { status: 500 }
    );
  }
}


export async function PATCH(request, { params }) {
  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const { player_id, guild_role } = await request.json();

    if (!["MEMBER", "OFFICER", "LEADER"].includes(guild_role)) {
      return NextResponse.json(
        { error: "Invalid guild role" },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [guilds] = await connection.query(
      "SELECT leader_id FROM guild WHERE guild_id = ? FOR UPDATE",
      [id]
    );

    if (guilds.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Guild not found" },
        { status: 404 }
      );
    }

    const [members] = await connection.query(
      `SELECT player_id FROM guild_membership
       WHERE guild_id = ? AND player_id = ?`,
      [id, player_id]
    );

    if (members.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    if (guild_role === "LEADER") {
      await connection.query(
        `UPDATE guild_membership
         SET guild_role = 'MEMBER'
         WHERE guild_id = ? AND guild_role = 'LEADER'`,
        [id]
      );

      await connection.query(
        `UPDATE guild_membership
         SET guild_role = 'LEADER'
         WHERE guild_id = ? AND player_id = ?`,
        [id, player_id]
      );

      await connection.query(
        "UPDATE guild SET leader_id = ? WHERE guild_id = ?",
        [player_id, id]
      );
    } else {
      if (String(guilds[0].leader_id) === String(player_id)) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Assign another leader before changing this role" },
          { status: 409 }
        );
      }

      await connection.query(
        `UPDATE guild_membership
         SET guild_role = ?
         WHERE guild_id = ? AND player_id = ?`,
        [guild_role, id, player_id]
      );
    }

    await connection.commit();

    return NextResponse.json({ message: "Member role updated" });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

export async function DELETE(request, { params }) {
  const connection = await pool.getConnection();

  try {
    const { id } = await params;
    const { player_id } = await request.json();

    await connection.beginTransaction();

    const [guilds] = await connection.query(
      "SELECT leader_id FROM guild WHERE guild_id = ? FOR UPDATE",
      [id]
    );

    if (guilds.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Guild not found" },
        { status: 404 }
      );
    }

    if (String(guilds[0].leader_id) === String(player_id)) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Assign another leader before removing this member" },
        { status: 409 }
      );
    }

    const [result] = await connection.query(
      `DELETE FROM guild_membership
       WHERE guild_id = ? AND player_id = ?`,
      [id, player_id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    await connection.commit();

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    await connection.rollback();
    console.error(error);

    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
