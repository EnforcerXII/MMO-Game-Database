import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const [rows] = await pool.query("SELECT 1 AS connected");

    return Response.json({
      success: true,
      message: "Database connected successfully!",
      result: rows[0],
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Database connection failed" },
      { status: 500 }
    );
  }
}
