import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession, detectDevice, getClientIp } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { cookies } from "next/headers";
import { PERMISSIONS } from "@/lib/permissions";

// POST /api/auth/qr/scan
// User scans a QR code (containing `escloud-qr:<token>`) with the QR Scanner.
// This endpoint validates the QR token and authorizes the corresponding PC session.
// The QR must be pending and not expired.
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Please sign in first to scan QR codes", 401);
  if (ctx.user.role !== "admin" && !ctx.user.permissions.includes(PERMISSIONS.QR_SCAN)) {
    return jsonError("You don't have permission to scan QR codes", 403);
  }
  try {
    const body = await req.json();
    let rawToken = String(body.token ?? "").trim();

    // Accept either the raw token or the QR payload `escloud-qr:<token>`
    if (rawToken.startsWith("escloud-qr:")) {
      rawToken = rawToken.slice("escloud-qr:".length);
    }
    if (!rawToken) return jsonError("Invalid QR code format", 400);

    const qr = await db.qRLoginSession.findUnique({ where: { token: rawToken } });
    if (!qr) return jsonError("This QR code is not valid", 404);

    if (qr.expiresAt.getTime() < Date.now()) {
      await db.qRLoginSession.update({
        where: { id: qr.id },
        data: { status: "expired" },
      });
      return jsonError("This QR code has expired. Please refresh the login page and try again.", 410);
    }

    if (qr.status === "used") return jsonError("This QR code has already been used", 410);
    if (qr.status === "authorized") return jsonError("This QR code has already been authorized", 409);
    if (qr.status === "expired") return jsonError("This QR code has expired", 410);
    if (qr.status !== "pending") return jsonError("This QR code is no longer valid", 400);

    // Authorize: link the QR to this user
    await db.qRLoginSession.update({
      where: { id: qr.id },
      data: {
        status: "authorized",
        userId: ctx.user.id,
        authorizedAt: new Date(),
        ip: getClientIp(req),
      },
    });

    return jsonOk({
      ok: true,
      message: "Login approved on the other device. The PC will sign in shortly.",
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to scan QR code", 500);
  }
}
