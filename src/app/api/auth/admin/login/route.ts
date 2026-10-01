import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, detectDevice, getClientIp, checkRateLimit, recordFailedLogin, clearRateLimit, logAdminActivity } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    if (!identifier || !password) {
      return jsonError("Missing credentials", 400);
    }

    const rlKey = `admin:${identifier.toLowerCase()}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      return jsonError(`Too many admin login attempts. Locked. Retry in ${Math.ceil(rl.retryAfterMs / 1000)}s.`, 429);
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier } },
          { username: { equals: identifier } },
        ],
      },
    });

    if (!user || user.role !== "admin" || user.status !== "active") {
      recordFailedLogin(rlKey);
      return jsonError("Administrator not found", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      recordFailedLogin(rlKey);
      return jsonError("Invalid administrator credentials", 401);
    }

    clearRateLimit(rlKey);
    const ua = req.headers.get("user-agent") ?? "";
    const ip = getClientIp(req);
    const { device, browser } = detectDevice(ua);
    const { token } = await createSession(user.id, { device, browser, ip });

    const cookieStore = await cookies();
    cookieStore.set("escloud_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    await logAdminActivity({
      adminId: user.id,
      action: "admin.login",
      ip,
      metadata: { device, browser },
    });

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        mustChangePwd: user.mustChangePwd,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Admin login failed", 500);
  }
}
