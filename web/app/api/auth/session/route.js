import { GetSession } from "@/lib/auth";

export async function GET() {
  try {
    const Player = await GetSession();
    return Response.json({ success: Boolean(Player), player: Player }, { status: Player ? 200 : 401 });
  } catch {
    return Response.json({ success: false, message: "Session unavailable" }, { status: 503 });
  }
}
