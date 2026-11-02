import pool from "@/lib/db";
import { GetSession } from "@/lib/auth";

export async function GET() {
  try {
    const Player = await GetSession();
    if (!Player) return Response.json({ success: false, message: "Please sign in" }, { status: 401 });

    const [Inventory] = await pool.execute(
      `SELECT i.item_name, v.quantity FROM inventory v
       JOIN item i ON i.item_id = v.item_id WHERE v.player_id = ? ORDER BY i.item_name`,
      [Player.player_id]
    );
    const [Achievements] = await pool.execute(
      `SELECT a.title, a.points, p.match_id FROM player_achievement p
       JOIN achievement a ON a.achievement_code = p.achievement_code
       WHERE p.player_id = ? ORDER BY p.unlocked_at DESC`,
      [Player.player_id]
    );
    return Response.json({ success: true, player: Player, inventory: Inventory, achievements: Achievements });
  } catch {
    return Response.json({ success: false, message: "Account unavailable" }, { status: 503 });
  }
}
