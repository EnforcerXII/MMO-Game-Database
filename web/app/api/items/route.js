import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

const validKinds = ["WEAPON", "COSMETIC"];
const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export async function GET(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    const [items] = await pool.execute(
      `SELECT * FROM item
       WHERE item_name LIKE ?
       ORDER BY item_id DESC`,
      [`%${search}%`]
    );

    return Response.json({ success: true, items });
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const body = await request.json();

    const {
      item_kind,
      item_name,
      rarity,
      base_price,
      damage,
      slot_type,
    } = body;

    const price = Number(base_price);
    const itemDamage = damage === "" || damage == null
      ? null
      : Number(damage);

    if (
      !validKinds.includes(item_kind) ||
      !validRarities.includes(rarity) ||
      !item_name?.trim() ||
      item_name.trim().length > 60 ||
      !Number.isFinite(price) ||
      price < 0 ||
      (itemDamage !== null &&
        (!Number.isInteger(itemDamage) || itemDamage < 0 || itemDamage > 32767)) ||
      (slot_type && slot_type.length > 16)
    ) {
      return Response.json(
        { success: false, message: "Invalid item information" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO item
       (item_kind, item_name, rarity, base_price, damage, slot_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item_kind,
        item_name.trim(),
        rarity,
        price,
        itemDamage,
        slot_type || null,
      ]
    );

    return Response.json(
      {
        success: true,
        message: "Item created successfully",
        item_id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "An item with this name already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to create item" },
      { status: 500 }
    );
  }
}
