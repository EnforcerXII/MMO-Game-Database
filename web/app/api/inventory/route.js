import pool from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = Number(searchParams.get("player_id"));

    const [players] = await pool.execute(
      `SELECT player_id, username
       FROM player
       WHERE status = 'ACTIVE'
       ORDER BY username`
    );

    const [items] = await pool.execute(
      `SELECT item_id, item_name, item_kind, rarity, base_price
       FROM item
       ORDER BY item_name`
    );

    let inventory = [];

    if (Number.isInteger(playerId) && playerId > 0) {
      const [rows] = await pool.execute(
        `SELECT
           i.player_id,
           i.item_id,
           i.quantity,
           i.acquired_at,
           it.item_name,
           it.item_kind,
           it.rarity,
           it.base_price
         FROM inventory i
         JOIN item it ON it.item_id = i.item_id
         WHERE i.player_id = ?
         ORDER BY it.item_name`,
        [playerId]
      );

      inventory = rows;
    }

    return Response.json({
      success: true,
      players,
      items,
      inventory,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const playerId = Number(body.player_id);
    const itemId = Number(body.item_id);
    const quantity = Number(body.quantity);

    if (
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(itemId) || itemId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0
    ) {
      return Response.json(
        { success: false, message: "Invalid inventory information" },
        { status: 400 }
      );
    }

    const [players] = await pool.execute(
      "SELECT player_id FROM player WHERE player_id = ? AND status = 'ACTIVE'",
      [playerId]
    );

    const [items] = await pool.execute(
      "SELECT item_id FROM item WHERE item_id = ?",
      [itemId]
    );

    if (!players.length || !items.length) {
      return Response.json(
        { success: false, message: "Player or item not found" },
        { status: 404 }
      );
    }

    await pool.execute(
      `INSERT INTO inventory (player_id, item_id, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [playerId, itemId, quantity, quantity]
    );

    return Response.json(
      { success: true, message: "Item added to inventory" },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to add item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const playerId = Number(body.player_id);
    const itemId = Number(body.item_id);
    const quantity = Number(body.quantity);

    if (
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(itemId) || itemId <= 0 ||
      !Number.isInteger(quantity) || quantity <= 0
    ) {
      return Response.json(
        { success: false, message: "Quantity must be a positive integer" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE inventory
       SET quantity = ?
       WHERE player_id = ? AND item_id = ?`,
      [quantity, playerId, itemId]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        `SELECT player_id FROM inventory
         WHERE player_id = ? AND item_id = ?`,
        [playerId, itemId]
      );

      if (!existing.length) {
        return Response.json(
          { success: false, message: "Inventory entry not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Inventory quantity updated",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to update quantity" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    const playerId = Number(searchParams.get("player_id"));
    const itemId = Number(searchParams.get("item_id"));

    if (
      !Number.isInteger(playerId) || playerId <= 0 ||
      !Number.isInteger(itemId) || itemId <= 0
    ) {
      return Response.json(
        { success: false, message: "Invalid player or item ID" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `DELETE FROM inventory
       WHERE player_id = ? AND item_id = ?`,
      [playerId, itemId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Inventory entry not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Item removed from inventory",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to remove item" },
      { status: 500 }
    );
  }
}
