import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET() {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const [rows] = await pool.query("SELECT 1 AS connected");

    return Response.json({
      success: true,
      message: "Database connected successfully!",
      result: rows[0],
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return Response.json(
      { success: false, message: "Database connection failed" },
      { status: 500 }
    );
  }
}
