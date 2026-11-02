import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("player_id");

    const [players] = await pool.execute(
      `SELECT player_id, username
       FROM player
       WHERE status = 'ACTIVE'
       ORDER BY username`
    );

    let query = `
      SELECT
        f.player_low,
        f.player_high,
        f.status,
        f.since,
        p1.username AS low_username,
        p2.username AS high_username
      FROM friendship f
      JOIN player p1 ON p1.player_id = f.player_low
      JOIN player p2 ON p2.player_id = f.player_high
    `;

    const values = [];

    if (playerId) {
      query += ` WHERE f.player_low = ? OR f.player_high = ?`;
      values.push(playerId, playerId);
    }

    query += ` ORDER BY f.since DESC`;

    const [friendships] = await pool.execute(query, values);

    return Response.json({
      success: true,
      players,
      friendships,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to fetch friendships" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const first = String(body.player1 || "");
    const second = String(body.player2 || "");

    if (
      !/^[1-9]\d*$/.test(first) ||
      !/^[1-9]\d*$/.test(second) ||
      BigInt(first) === BigInt(second)
    ) {
      return Response.json(
        { success: false, message: "Select two different valid players" },
        { status: 400 }
      );
    }

    const [low, high] =
      BigInt(first) < BigInt(second)
        ? [first, second]
        : [second, first];

    await pool.execute(
      `INSERT INTO friendship (player_low, player_high, status)
       VALUES (?, ?, 'PENDING')`,
      [low, high]
    );

    return Response.json(
      { success: true, message: "Friendship request created" },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "A relationship already exists between these players" },
        { status: 409 }
      );
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return Response.json(
        { success: false, message: "One or both players do not exist" },
        { status: 400 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to create friendship" },
      { status: 500 }
    );
  }
}
