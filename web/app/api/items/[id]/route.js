import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

const validKinds = ["WEAPON", "COSMETIC"];
const validRarities = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const itemId = Number(id);
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
      !Number.isInteger(itemId) || itemId <= 0 ||
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
      `UPDATE item
       SET item_kind = ?, item_name = ?, rarity = ?,
           base_price = ?, damage = ?, slot_type = ?
       WHERE item_id = ?`,
      [
        item_kind,
        item_name.trim(),
        rarity,
        price,
        itemDamage,
        slot_type || null,
        itemId,
      ]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT item_id FROM item WHERE item_id = ?",
        [itemId]
      );

      if (existing.length === 0) {
        return Response.json(
          { success: false, message: "Item not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Item updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "An item with this name already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to update item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const itemId = Number(id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return Response.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      "DELETE FROM item WHERE item_id = ?",
      [itemId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return Response.json(
        {
          success: false,
          message: "This item is owned by players. Remove it from their inventories first.",
        },
        { status: 409 }
      );
    }

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to delete item" },
      { status: 500 }
    );
  }
}
