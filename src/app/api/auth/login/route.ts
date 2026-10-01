import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession, detectDevice, getClientIp, checkRateLimit, recordFailedLogin, clearRateLimit, logAdminActivity } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  try {
    const body = await req.json();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    if (!identifier || !password) {
      return jsonError("Missing identifier or password", 400);
    }

    const rlKey = `login:${identifier.toLowerCase()}`;
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      return jsonError(`Too many attempts. Try again in ${Math.ceil(rl.retryAfterMs / 1000)}s.`, 429);
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: { equals: identifier } },
          { username: { equals: identifier } },
        ],
        status: "active",
      },
    });

    if (!user) {
      recordFailedLogin(rlKey);
      return jsonError("Invalid credentials", 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      recordFailedLogin(rlKey);
      return jsonError("Invalid credentials", 401);
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

    if (user.role === "admin") {
      await logAdminActivity({
        adminId: user.id,
        action: "admin.login",
        ip,
        metadata: { device, browser },
      });
    }

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
    return jsonError(e?.message ?? "Login failed", 500);
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonOk({ user: null, isImpersonating: false, impersonatingAdmin: null });
  return jsonOk({
    user: {
      id: ctx.user.id,
      username: ctx.user.username,
      email: ctx.user.email,
      displayName: ctx.user.displayName,
      role: ctx.user.role,
      status: ctx.user.status,
      avatarPath: ctx.user.avatarPath,
      permissions: ctx.user.permissions,
      storageQuota: ctx.user.storageQuota,
      uploadMaxBytes: ctx.user.uploadMaxBytes,
      uploadEnabled: ctx.user.uploadEnabled,
      downloadEnabled: ctx.user.downloadEnabled,
      approvalRequired: ctx.user.approvalRequired,
      mustChangePwd: false,
    },
    isImpersonating: ctx.isImpersonating,
    impersonatingAdmin: ctx.impersonatingAdmin
      ? {
          id: ctx.impersonatingAdmin.id,
          username: ctx.impersonatingAdmin.username,
          email: ctx.impersonatingAdmin.email,
          displayName: ctx.impersonatingAdmin.displayName,
        }
      : null,
  });
}
