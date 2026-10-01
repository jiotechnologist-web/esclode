import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { resolveStoragePath, PATHS, safeFilename } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

// GET /api/profile - current user's profile + storage usage
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);

  const user = await db.user.findUnique({ where: { id: ctx.user.id } });
  if (!user) return jsonError("User not found", 404);

  const storageAgg = await db.media.aggregate({
    where: { ownerId: ctx.user.id },
    _sum: { size: true },
  });
  const mediaByType = await db.media.groupBy({
    by: ["type"],
    where: { ownerId: ctx.user.id },
    _count: { _all: true },
    _sum: { size: true },
  });

  return jsonOk({
    profile: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatarPath: user.avatarPath,
      avatarUrl: user.avatarPath ? `/api/profile/avatar?path=${encodeURIComponent(user.avatarPath)}` : null,
      role: user.role,
      status: user.status,
      permissions: JSON.parse(user.permissions || "[]"),
      storageQuota: Number(user.storageQuota),
      uploadMaxBytes: Number(user.uploadMaxBytes),
      uploadEnabled: user.uploadEnabled,
      downloadEnabled: user.downloadEnabled,
      approvalRequired: user.approvalRequired,
      mustChangePwd: user.mustChangePwd,
      createdAt: user.createdAt.toISOString(),
    },
    storage: {
      used: Number(storageAgg._sum.size ?? 0),
      quota: Number(user.storageQuota),
      remaining: Math.max(0, Number(user.storageQuota) - Number(storageAgg._sum.size ?? 0)),
      byType: mediaByType.map((m) => ({
        type: m.type,
        count: m._count._all,
        size: Number(m._sum.size ?? 0),
      })),
    },
  });
}

// PATCH /api/profile - update display info
export async function PATCH(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);

  const body = await req.json();
  const data: any = {};
  if (body.displayName !== undefined) data.displayName = String(body.displayName).slice(0, 100) || null;
  if (body.phone !== undefined) data.phone = String(body.phone).slice(0, 50) || null;
  if (body.email !== undefined) {
    // email change for user — check uniqueness
    const conflict = await db.user.findUnique({ where: { email: String(body.email) } });
    if (conflict && conflict.id !== ctx.user.id) return jsonError("Email already in use", 409);
    data.email = String(body.email);
  }
  if (body.username !== undefined) {
    const conflict = await db.user.findUnique({ where: { username: String(body.username) } });
    if (conflict && conflict.id !== ctx.user.id) return jsonError("Username taken", 409);
    data.username = String(body.username);
  }

  await db.user.update({ where: { id: ctx.user.id }, data });
  return jsonOk({ ok: true });
}
