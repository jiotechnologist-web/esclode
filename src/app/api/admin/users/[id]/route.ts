import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { serializePermissions } from "@/lib/permissions";
import { hashPassword, destroyAllUserSessions, logAdminActivity, getClientIp } from "@/lib/auth";

// GET /api/admin/users/[id] - detailed view of a user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return jsonError("Not found", 404);

  const storageAgg = await db.media.aggregate({ where: { ownerId: id }, _sum: { size: true }, _count: { _all: true } });
  const mediaCounts = await db.media.groupBy({
    by: ["type"],
    where: { ownerId: id },
    _count: { _all: true },
    _sum: { size: true },
  });
  const sessions = await db.session.findMany({ where: { userId: id }, orderBy: { lastActive: "desc" } });

  return jsonOk({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarPath: user.avatarPath,
      role: user.role,
      status: user.status,
      permissions: JSON.parse(user.permissions || "[]"),
      storageQuota: Number(user.storageQuota),
      uploadMaxBytes: Number(user.uploadMaxBytes),
      dailyUploadLimit: Number(user.dailyUploadLimit),
      dailyDownloadLimit: Number(user.dailyDownloadLimit),
      uploadEnabled: user.uploadEnabled,
      downloadEnabled: user.downloadEnabled,
      approvalRequired: user.approvalRequired,
      mustChangePwd: user.mustChangePwd,
      expiresAt: user.expiresAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    storage: {
      used: Number(storageAgg._sum.size ?? 0),
      quota: Number(user.storageQuota),
      mediaCount: storageAgg._count._all ?? 0,
      byType: mediaCounts.map((m) => ({
        type: m.type,
        count: m._count._all,
        size: Number(m._sum.size ?? 0),
      })),
    },
    sessions: sessions.map((s) => ({
      id: s.id,
      device: s.device,
      browser: s.browser,
      ip: s.ip,
      lastActive: s.lastActive.toISOString(),
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  });
}

// PATCH /api/admin/users/[id] - update user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return jsonError("Not found", 404);

  try {
    const body = await req.json();
    const data: any = {};
    if (body.username !== undefined && body.username !== user.username) {
      const conflict = await db.user.findUnique({ where: { username: String(body.username) } });
      if (conflict) return jsonError("Username taken", 409);
      data.username = String(body.username);
    }
    if (body.email !== undefined && body.email !== user.email) {
      const conflict = await db.user.findUnique({ where: { email: String(body.email) } });
      if (conflict) return jsonError("Email taken", 409);
      data.email = String(body.email);
    }
    if (body.displayName !== undefined) data.displayName = body.displayName ?? null;
    if (body.phone !== undefined) data.phone = body.phone ?? null;
    if (body.role !== undefined) data.role = body.role === "admin" ? "admin" : "user";
    if (body.status !== undefined) {
      const s = String(body.status);
      if (["active", "suspended", "deleted"].includes(s)) data.status = s;
    }
    if (body.permissions !== undefined) data.permissions = serializePermissions(body.permissions);
    if (body.storageQuota !== undefined) data.storageQuota = BigInt(Number(body.storageQuota));
    if (body.uploadMaxBytes !== undefined) data.uploadMaxBytes = BigInt(Number(body.uploadMaxBytes));
    if (body.dailyUploadLimit !== undefined) data.dailyUploadLimit = BigInt(Number(body.dailyUploadLimit));
    if (body.dailyDownloadLimit !== undefined) data.dailyDownloadLimit = BigInt(Number(body.dailyDownloadLimit));
    if (body.uploadEnabled !== undefined) data.uploadEnabled = !!body.uploadEnabled;
    if (body.downloadEnabled !== undefined) data.downloadEnabled = !!body.downloadEnabled;
    if (body.approvalRequired !== undefined) data.approvalRequired = !!body.approvalRequired;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.mustChangePwd !== undefined) data.mustChangePwd = !!body.mustChangePwd;

    await db.user.update({ where: { id }, data });
    await logAdminActivity({
      adminId: ctx.user.id,
      action: "user.update",
      targetUserId: id,
      ip: getClientIp(req),
      metadata: { fields: Object.keys(data) },
    });
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Update failed", 500);
  }
}

// DELETE /api/admin/users/[id] - delete user (hard delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  if (id === ctx.user.id) return jsonError("Cannot delete self", 400);
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return jsonError("Not found", 404);

  await db.user.delete({ where: { id } });
  await logAdminActivity({
    adminId: ctx.user.id,
    action: "user.delete",
    targetUserId: id,
    ip: getClientIp(req),
    metadata: { username: user.username },
  });
  return jsonOk({ ok: true });
}
