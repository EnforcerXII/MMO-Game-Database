import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    let sql = `
      SELECT
        player_id,
        username,
        email,
        date_of_birth,
        role,
        status,
        created_at
      FROM player
      WHERE (username LIKE ? OR email LIKE ?)
    `;

    const params = [`%${search}%`, `%${search}%`];

    if (["ACTIVE", "BANNED"].includes(status)) {
      sql += " AND status = ?";
      params.push(status);
    }

    sql += " ORDER BY created_at DESC";

    const [players] = await pool.execute(sql, params);

    return Response.json({
      success: true,
      players,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Players GET error:", error);

    return Response.json(
      { success: false, message: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const body = await request.json();

    const { username, email, password, date_of_birth } = body;

    if (!username || !email || !password || !date_of_birth) {
      return Response.json(
        { success: false, message: "All fields are required" },
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

    if (password.length < 8) {
      return Response.json(
        { success: false, message: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO player
        (username, email, password_hash, date_of_birth)
       VALUES (?, ?, ?, ?)`,
      [username.trim(), email.trim(), passwordHash, date_of_birth]
    );

    return Response.json(
      {
        success: true,
        message: "Player created successfully",
        player_id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Players POST error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Username or email already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to create player" },
      { status: 500 }
    );
  }
}
