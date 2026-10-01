import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { DEFAULT_USER_PERMISSIONS, PERMISSIONS, ADMIN_TOGGLEABLE_PERMISSIONS, serializePermissions } from "@/lib/permissions";
import { hashPassword, logAdminActivity, getClientIp } from "@/lib/auth";

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const role = url.searchParams.get("role") ?? "";

  const where: any = {};
  if (search) {
    where.OR = [
      { username: { contains: search } },
      { email: { contains: search } },
      { displayName: { contains: search } },
    ];
  }
  if (status && status !== "all") where.status = status;
  if (role) where.role = role;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const userIds = users.map((u) => u.id);
  const storageAggs = await db.media.groupBy({
    by: ["ownerId"],
    where: { ownerId: { in: userIds } },
    _sum: { size: true },
    _count: { _all: true },
  });
  const sessions = await db.session.findMany({
    where: { userId: { in: userIds } },
    orderBy: { lastActive: "desc" },
    select: { userId: true, lastActive: true },
  });
  const lastActiveMap = new Map<string, Date>();
  for (const s of sessions) {
    if (!lastActiveMap.has(s.userId)) lastActiveMap.set(s.userId, s.lastActive);
    else {
      const cur = lastActiveMap.get(s.userId)!;
      if (s.lastActive > cur) lastActiveMap.set(s.userId, s.lastActive);
    }
  }

  return jsonOk({
    users: users.map((u) => {
      const agg = storageAggs.find((a) => a.ownerId === u.id);
      const perms = u.permissions ? JSON.parse(u.permissions || "[]") : [];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        phone: u.phone,
        avatarPath: u.avatarPath,
        avatarUrl: u.avatarPath ? `/api/profile/avatar?path=${encodeURIComponent(u.avatarPath)}` : null,
        permissions: perms,
        hasPrivateAccess: perms.includes(PERMISSIONS.PRIVATE_ACCESS),
        canUpload: u.uploadEnabled && (
          perms.includes(PERMISSIONS.UPLOAD_VIDEOS) ||
          perms.includes(PERMISSIONS.UPLOAD_PHOTOS) ||
          perms.includes(PERMISSIONS.UPLOAD_DOCUMENTS) ||
          perms.includes(PERMISSIONS.UPLOAD_CONTACTS)
        ),
        storageQuota: Number(u.storageQuota),
        usedStorage: Number(agg?._sum.size ?? 0),
        uploadMaxBytes: Number(u.uploadMaxBytes),
        uploadEnabled: u.uploadEnabled,
        downloadEnabled: u.downloadEnabled,
        approvalRequired: u.approvalRequired,
        expiresAt: u.expiresAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: lastActiveMap.get(u.id)?.toISOString() ?? null,
        mediaCount: agg?._count._all ?? 0,
        mustChangePwd: u.mustChangePwd,
      };
    }),
  });
}

// POST /api/admin/users — create a new user
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    const displayName = body.displayName ? String(body.displayName) : null;
    const role = body.role === "admin" ? "admin" : "user";
    const permissions = Array.isArray(body.permissions) ? body.permissions : DEFAULT_USER_PERMISSIONS;
    const storageQuota = Number(body.storageQuota ?? 10 * 1024 * 1024 * 1024);
    const uploadMaxBytes = Number(body.uploadMaxBytes ?? 2 * 1024 * 1024 * 1024);

    if (!username || !email || !password) return jsonError("Missing fields", 400);
    if (password.length < 6) return jsonError("Password too short (min 6)", 400);

    const existing = await db.user.findFirst({
      where: { OR: [{ email: { equals: email } }, { username: { equals: username } }] },
    });
    if (existing) return jsonError("User with same email/username exists", 409);

    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(password),
        displayName,
        role,
        status: "active",
        permissions: serializePermissions(permissions),
        storageQuota: BigInt(storageQuota),
        uploadMaxBytes: BigInt(uploadMaxBytes),
      },
    });

    await logAdminActivity({
      adminId: ctx.user.id,
      action: "user.create",
      targetUserId: user.id,
      ip: getClientIp(req),
      metadata: { username, email, role },
    });

    return jsonOk({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to create user", 500);
  }
}

// PATCH /api/admin/users — bulk update (e.g., bulk grant/remove private access)
export async function PATCH(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  try {
    const body = await req.json();
    const userIds: string[] = Array.isArray(body.userIds) ? body.userIds.filter((x: any) => typeof x === "string") : [];
    if (userIds.length === 0) return jsonError("No users selected", 400);

    const action = String(body.action ?? "");
    let updated = 0;

    for (const uid of userIds) {
      const user = await db.user.findUnique({ where: { id: uid } });
      if (!user || user.role === "admin") continue; // never modify admins in bulk

      const perms = JSON.parse(user.permissions || "[]") as string[];

      if (action === "grant_private_access") {
        if (!perms.includes(PERMISSIONS.PRIVATE_ACCESS)) {
          perms.push(PERMISSIONS.PRIVATE_ACCESS);
        }
        if (!perms.includes(PERMISSIONS.VIEW_PRIVATE)) perms.push(PERMISSIONS.VIEW_PRIVATE);
      } else if (action === "revoke_private_access") {
        const idx = perms.indexOf(PERMISSIONS.PRIVATE_ACCESS);
        if (idx >= 0) perms.splice(idx, 1);
        // Also remove view_private if user has no other reason for it
        const vpIdx = perms.indexOf(PERMISSIONS.VIEW_PRIVATE);
        if (vpIdx >= 0) perms.splice(vpIdx, 1);
      } else if (action === "grant_upload") {
        if (!perms.includes(PERMISSIONS.UPLOAD_VIDEOS)) perms.push(PERMISSIONS.UPLOAD_VIDEOS);
        if (!perms.includes(PERMISSIONS.UPLOAD_PHOTOS)) perms.push(PERMISSIONS.UPLOAD_PHOTOS);
        if (!perms.includes(PERMISSIONS.UPLOAD_DOCUMENTS)) perms.push(PERMISSIONS.UPLOAD_DOCUMENTS);
        if (!perms.includes(PERMISSIONS.UPLOAD_CONTACTS)) perms.push(PERMISSIONS.UPLOAD_CONTACTS);
      } else if (action === "revoke_upload") {
        for (const p of [PERMISSIONS.UPLOAD_VIDEOS, PERMISSIONS.UPLOAD_PHOTOS, PERMISSIONS.UPLOAD_DOCUMENTS, PERMISSIONS.UPLOAD_CONTACTS]) {
          const i = perms.indexOf(p);
          if (i >= 0) perms.splice(i, 1);
        }
      } else if (action === "grant_qr_scan") {
        if (!perms.includes(PERMISSIONS.QR_SCAN)) perms.push(PERMISSIONS.QR_SCAN);
      } else if (action === "revoke_qr_scan") {
        const i = perms.indexOf(PERMISSIONS.QR_SCAN);
        if (i >= 0) perms.splice(i, 1);
      } else if (action === "grant_all") {
        // Grant ALL toggleable permissions (including private_access, qr_scan)
        for (const p of ADMIN_TOGGLEABLE_PERMISSIONS) {
          if (!perms.includes(p.key)) perms.push(p.key);
        }
      } else if (action === "revoke_all") {
        // Revoke all toggleable permissions except the system defaults
        const toggleable = new Set(ADMIN_TOGGLEABLE_PERMISSIONS.map((p) => p.key));
        const filtered = perms.filter((p) => !toggleable.has(p));
        perms.length = 0;
        perms.push(...filtered);
      } else if (action === "activate") {
        await db.user.update({ where: { id: uid }, data: { status: "active" } });
        updated++;
        continue;
      } else if (action === "suspend") {
        await db.user.update({ where: { id: uid }, data: { status: "suspended" } });
        updated++;
        continue;
      } else {
        continue;
      }

      await db.user.update({
        where: { id: uid },
        data: { permissions: serializePermissions(perms) },
      });
      updated++;
    }

    await logAdminActivity({
      adminId: ctx.user.id,
      action: `user.bulk.${action}`,
      ip: getClientIp(req),
      metadata: { userIds, count: updated },
    });

    return jsonOk({ ok: true, updated });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to update users", 500);
  }
}
