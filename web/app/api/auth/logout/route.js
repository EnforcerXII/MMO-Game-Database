import { DeleteSession } from "@/lib/auth";

export async function POST() {
  try {
    await DeleteSession();
    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, message: "Sign-out unavailable" }, { status: 503 });
  }
}
