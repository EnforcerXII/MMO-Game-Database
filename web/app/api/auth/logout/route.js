import { ValidateRequest } from "@/lib/security";
import { DeleteSession } from "@/lib/auth";

export async function POST(Request) {
  try {
    const RequestError = await ValidateRequest(Request);
    if (RequestError) return RequestError;
    await DeleteSession();
    return Response.json({ success: true });
  } catch {
    return Response.json({ success: false, message: "Sign-out unavailable" }, { status: 503 });
  }
}
