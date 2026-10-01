import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { hashPassword, generateToken, destroyAllUserSessions, logAdminActivity, getClientIp, createSession, detectDevice } from "@/lib/auth";
import { cookies } from "next/headers";

// POST /api/admin/users/[id]/impersonate - start impersonation
// We use a separate impersonation token + cookie that overrides the session user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const targetUser = await db.user.findUnique({ where: { id } });
  if (!targetUser) return jsonError("User not found", 404);
  if (targetUser.role === "admin") return jsonError("Cannot impersonate another admin", 400);
  if (targetUser.status !== "active") return jsonError("Target user not active", 400);

  const impToken = generateToken(40);

  // Create an impersonation record
  await db.impersonation.create({
    data: {
      adminId: ctx.user.id,
      userId: id,
      token: impToken,
      reason: "admin_panel_switch",
    },
  });

  // Create a NEW session for the user (the admin's own session remains intact via the impersonation cookie)
  const ua = req.headers.get("user-agent") ?? "";
  const ip = getClientIp(req);
  const { device, browser } = detectDevice(ua);
  const { token: userSessionToken } = await createSession(id, {
    device: `${device} (Admin Impersonation)`,
    browser,
    ip,
  });

  // Set the impersonation cookie first, then override the main session cookie with the user's session.
  const cookieStore = await cookies();
  cookieStore.set("escloud_impersonation", impToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours max
  });
  cookieStore.set("escloud_session", userSessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours max
  });

  await logAdminActivity({
    adminId: ctx.user.id,
    action: "user.impersonate.start",
    targetUserId: id,
    ip,
    metadata: { username: targetUser.username },
  });

  return jsonOk({
    ok: true,
    impersonating: {
      id: targetUser.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
    },
  });
}

// DELETE - stop impersonation, restore admin session
export async function DELETE(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.isImpersonating || !ctx.impersonatingAdmin) {
    return jsonError("Not impersonating", 400);
  }
  const cookieStore = await cookies();
  const impToken = cookieStore.get("escloud_impersonation")?.value;

  // End impersonation
  if (impToken) {
    await db.impersonation.update({
      where: { token: impToken },
      data: { endedAt: new Date() },
    });
  }

  // The admin needs a fresh session. We'll use the impersonation admin record to find admin ID,
  // then create a fresh session for them. The previous admin session may have been destroyed on user switch.
  const adminId = ctx.impersonatingAdmin.id;
  const ua = req.headers.get("user-agent") ?? "";
  const ip = getClientIp(req);
  const { device, browser } = detectDevice(ua);
  const { token: adminSession } = await createSession(adminId, { device, browser, ip });

  // Destroy current (impersonated) user session
  const userToken = cookieStore.get("escloud_session")?.value;
  if (userToken) {
    try {
      await db.session.deleteMany({ where: { token: userToken } });
    } catch {}
  }

  cookieStore.delete("escloud_impersonation");
  cookieStore.set("escloud_session", adminSession, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await logAdminActivity({
    adminId,
    action: "user.impersonate.stop",
    targetUserId: ctx.user?.id,
    ip,
  });

  return jsonOk({ ok: true });
}
