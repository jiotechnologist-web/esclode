import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession, detectDevice, getClientIp } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { cookies } from "next/headers";

// Mobile user authorizes the QR login (sets the QR's userId)
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  if (ctx.user.role !== "admin" && !ctx.user.permissions.includes("qr_login")) {
    return jsonError("QR login not permitted", 403);
  }
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    if (!token) return jsonError("Missing token", 400);

    const qr = await db.qRLoginSession.findUnique({ where: { token } });
    if (!qr) return jsonError("Invalid QR token", 404);
    if (qr.expiresAt.getTime() < Date.now()) {
      await db.qRLoginSession.update({ where: { id: qr.id }, data: { status: "expired" } });
      return jsonError("QR token expired", 410);
    }
    if (qr.status !== "pending") return jsonError("QR token already used", 409);

    await db.qRLoginSession.update({
      where: { id: qr.id },
      data: { status: "authorized", userId: ctx.user.id, authorizedAt: new Date() },
    });

    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to authorize QR", 500);
  }
}

// PC verifies + exchanges for a real session
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return jsonError("Missing token", 400);
  try {
    const qr = await db.qRLoginSession.findUnique({ where: { token } });
    if (!qr) return jsonError("Invalid token", 404);
    if (qr.expiresAt.getTime() < Date.now()) {
      return jsonError("Token expired", 410);
    }
    if (qr.status === "pending") return jsonOk({ status: "pending" });
    if (qr.status === "expired") return jsonError("Token expired", 410);
    if (qr.status === "used") return jsonError("Token already consumed", 410);
    if (qr.status !== "authorized" || !qr.userId) return jsonError("Not authorized", 401);

    // Exchange: create a session for the user
    const ua = req.headers.get("user-agent") ?? "";
    const ip = getClientIp(req);
    const { device, browser } = detectDevice(ua);
    const { token: sessionToken } = await createSession(qr.userId, {
      device: device + " (QR)",
      browser,
      ip,
    });

    // Mark as used
    await db.qRLoginSession.update({
      where: { id: qr.id },
      data: { status: "used", usedAt: new Date() },
    });

    const cookieStore = await cookies();
    cookieStore.set("escloud_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    const user = await db.user.findUnique({ where: { id: qr.userId } });
    return jsonOk({
      status: "ok",
      user: user
        ? {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            mustChangePwd: user.mustChangePwd,
          }
        : null,
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "QR verify failed", 500);
  }
}
