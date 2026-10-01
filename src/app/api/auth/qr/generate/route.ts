import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generateToken, QR_TTL_MS } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

// Generate a new QR login token (PC displays this as QR code)
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  // Any authenticated user can hit this to authorize a PC session.
  // PC side calls this without auth to GET a new pending token.
  try {
    const token = generateToken(32);
    const session = await db.qRLoginSession.create({
      data: {
        token,
        status: "pending",
        expiresAt: new Date(Date.now() + QR_TTL_MS),
      },
    });
    return jsonOk({ token, expiresAt: session.expiresAt });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to generate QR token", 500);
  }
}

// PC polls status
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return jsonError("Missing token", 400);
  try {
    const session = await db.qRLoginSession.findUnique({ where: { token } });
    if (!session) return jsonError("Invalid token", 404);
    if (session.status === "expired" || session.expiresAt.getTime() < Date.now()) {
      return jsonOk({ status: "expired" });
    }
    return jsonOk({ status: session.status, expiresAt: session.expiresAt });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to check QR status", 500);
  }
}
