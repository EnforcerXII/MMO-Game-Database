import { DatabaseError } from "@/lib/validation";
import { RequireAdmin } from "@/lib/auth";

import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { id } = await params;

    const [rounds] = await pool.query(
      `SELECT match_id, round_no, winning_team, duration_sec
       FROM match_round
       WHERE match_id = ?
       ORDER BY round_no`,
      [id]
    );

    return NextResponse.json({
      success: true,
      rounds,
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch rounds" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const { round_no, winning_team, duration_sec } =
      await request.json();

    const roundNo = Number(round_no);
    const winningTeam =
      winning_team === "" || winning_team == null
        ? null
        : Number(winning_team);
    const duration =
      duration_sec === "" || duration_sec == null
        ? null
        : Number(duration_sec);

    if (
      !Number.isInteger(roundNo) ||
      roundNo < 1 ||
      roundNo > 32767 ||
      (winningTeam !== null &&
        (!Number.isInteger(winningTeam) ||
          winningTeam < 1 ||
          winningTeam > 32767)) ||
      (duration !== null &&
        (!Number.isInteger(duration) ||
          duration < 0 ||
          duration > 2147483647))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid round details" },
        { status: 400 }
      );
    }

    await pool.query(
      `INSERT INTO match_round
       (match_id, round_no, winning_team, duration_sec)
       VALUES (?, ?, ?, ?)`,
      [id, roundNo, winningTeam, duration]
    );

    return NextResponse.json(
      { success: true, message: "Round added successfully" },
      { status: 201 }
    );
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "This round already exists" },
        { status: 409 }
      );
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { success: false, message: "Match does not exist" },
        { status: 404 }
      );
    }

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to add round" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const { round_no, winning_team, duration_sec } =
      await request.json();

    const roundNo = Number(round_no);
    const winningTeam =
      winning_team === "" || winning_team == null
        ? null
        : Number(winning_team);
    const duration =
      duration_sec === "" || duration_sec == null
        ? null
        : Number(duration_sec);

    if (
      !Number.isInteger(roundNo) ||
      roundNo < 1 ||
      roundNo > 32767 ||
      (winningTeam !== null &&
        (!Number.isInteger(winningTeam) ||
          winningTeam < 1 ||
          winningTeam > 32767)) ||
      (duration !== null &&
        (!Number.isInteger(duration) ||
          duration < 0 ||
          duration > 2147483647))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid round details" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `UPDATE match_round
       SET winning_team = ?, duration_sec = ?
       WHERE match_id = ? AND round_no = ?`,
      [winningTeam, duration, id, roundNo]
    );

    if (result.affectedRows === 0) {
      const [existing] = await pool.query(
        `SELECT round_no FROM match_round
         WHERE match_id = ? AND round_no = ?`,
        [id, roundNo]
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, message: "Round not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Round updated successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to update round" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const AccessError = await RequireAdmin();
  if (AccessError) return AccessError;

  try {
    const { id } = await params;
    const roundNo = Number(
      new URL(request.url).searchParams.get("round_no")
    );

    if (!Number.isInteger(roundNo) || roundNo < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid round number" },
        { status: 400 }
      );
    }

    const [result] = await pool.query(
      `DELETE FROM match_round
       WHERE match_id = ? AND round_no = ?`,
      [id, roundNo]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Round not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Round deleted successfully",
    });
  } catch (error) {
    const ValidationError = DatabaseError(error);
    if (ValidationError) return ValidationError;

    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to delete round" },
      { status: 500 }
    );
  }
}
