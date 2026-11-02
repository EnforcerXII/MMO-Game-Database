import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { code } = await params;
    const body = await request.json();

    const title = body.title?.trim();
    const points = Number(body.points);

    if (
      !title ||
      title.length > 60 ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 32767
    ) {
      return Response.json(
        { success: false, message: "Invalid achievement information" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE achievement
       SET title = ?, points = ?
       WHERE achievement_code = ?`,
      [title, points, code]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        "SELECT achievement_code FROM achievement WHERE achievement_code = ?",
        [code]
      );

      if (!existing.length) {
        return Response.json(
          { success: false, message: "Achievement not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Achievement updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error("Database request failed:", error.code || "UNKNOWN");

    if (error.code === "ER_DUP_ENTRY") {
      return Response.json(
        { success: false, message: "Achievement title already exists" },
        { status: 409 }
      );
    }

    return Response.json(
      { success: false, message: "Failed to update achievement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin(request);
  if (AccessError) return AccessError;

  try {
    const { code } = await params;

    const [result] = await pool.execute(
      "DELETE FROM achievement WHERE achievement_code = ?",
      [code]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Achievement not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Achievement deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return Response.json(
        {
          success: false,
          message: "This achievement has already been awarded and cannot be deleted.",
        },
        { status: 409 }
      );
    }

    console.error("Database request failed:", error.code || "UNKNOWN");

    return Response.json(
      { success: false, message: "Failed to delete achievement" },
      { status: 500 }
    );
  }
}
