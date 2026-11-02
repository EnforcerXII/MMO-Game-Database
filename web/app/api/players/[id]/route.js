import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const playerId = Number(id);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return Response.json(
        { success: false, message: "Invalid player ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, email, date_of_birth, status, password } = body;

    if (
      !username ||
      !email ||
      !date_of_birth ||
      !["ACTIVE", "BANNED"].includes(status)
    ) {
      return Response.json(
        { success: false, message: "Invalid player information" },
        { status: 400 }
      );
    }

    if (username.length > 24 || email.length > 254) {
      return Response.json(
        { success: false, message: "Username or email is too long" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    const [existing] = await pool.execute(
      "SELECT player_id FROM player WHERE player_id = ?",
      [playerId]
    );

    if (existing.length === 0) {
      return Response.json(
        { success: false, message: "Player not found" },
        { status: 404 }
      );
    }

    if (password && (password.length < 8 || Buffer.byteLength(password, "utf8") > 72)) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters and at most 72 UTF-8 bytes" },
        { status: 400 }
      );
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);

      await pool.execute(
        `UPDATE player
         SET username = ?, email = ?, date_of_birth = ?,
             status = ?, password_hash = ?
         WHERE player_id = ?`,
        [
          username.trim(),
          email.trim(),
          date_of_birth,
          status,
          passwordHash,
          playerId,
        ]
      );
    } else {
      await pool.execute(
        `UPDATE player
         SET username = ?, email = ?, date_of_birth = ?, status = ?
         WHERE player_id = ?`,
        [
          username.trim(),
          email.trim(),
          date_of_birth,
          status,
          playerId,
        ]
      );
    }

    return Response.json({
      success: true,
      message: "Player updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Username or email already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to update player" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const playerId = Number(id);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return Response.json(
        { success: false, message: "Invalid player ID" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      "DELETE FROM player WHERE player_id = ?",
      [playerId]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Player not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Player deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return Response.json(
        {
          success: false,
          message:
            "This player is referenced by another record, possibly as a guild leader. Resolve that relationship first.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to delete player" },
      { status: 500 }
    );
  }
}
