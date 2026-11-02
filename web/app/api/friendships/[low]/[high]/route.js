import pool from "@/lib/db";

export async function PATCH(request, { params }) {
  try {
    const { low, high } = await params;
    const { status } = await request.json();

    const allowedStatuses = ["PENDING", "ACCEPTED", "BLOCKED"];

    if (
      !/^[1-9]\d*$/.test(low) ||
      !/^[1-9]\d*$/.test(high) ||
      BigInt(low) >= BigInt(high) ||
      !allowedStatuses.includes(status)
    ) {
      return Response.json(
        { success: false, message: "Invalid friendship information" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `UPDATE friendship
       SET status = ?
       WHERE player_low = ? AND player_high = ?`,
      [status, low, high]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.execute(
        `SELECT player_low FROM friendship
         WHERE player_low = ? AND player_high = ?`,
        [low, high]
      );

      if (!existing.length) {
        return Response.json(
          { success: false, message: "Friendship not found" },
          { status: 404 }
        );
      }
    }

    return Response.json({
      success: true,
      message: "Friendship status updated",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to update friendship" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { low, high } = await params;

    if (
      !/^[1-9]\d*$/.test(low) ||
      !/^[1-9]\d*$/.test(high) ||
      BigInt(low) >= BigInt(high)
    ) {
      return Response.json(
        { success: false, message: "Invalid friendship IDs" },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `DELETE FROM friendship
       WHERE player_low = ? AND player_high = ?`,
      [low, high]
    );

    if (result.affectedRows === 0) {
      return Response.json(
        { success: false, message: "Friendship not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Friendship removed",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { success: false, message: "Failed to remove friendship" },
      { status: 500 }
    );
  }
}
