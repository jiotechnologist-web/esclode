import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk, canAccessMedia } from "@/lib/api";
import { safeDeleteStoragePath } from "@/lib/storage";
import { promises as fs } from "fs";
import { logAdminActivity, getClientIp } from "@/lib/auth";

// GET /api/media/[id] — return single media item if user has access
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canSee = await canAccessMedia(ctx.user, id);
  if (!canSee) return jsonError("Not authorized to view this content", 403);

  const media = await db.media.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      owner: { select: { username: true, displayName: true } },
    },
  });
  if (!media) return jsonError("Not found", 404);

  // Get access list for admin / owner
  let accessUsers: any[] = [];
  if (ctx.user.role === "admin" || media.ownerId === ctx.user.id) {
    const accesses = await db.privateAccess.findMany({
      where: { mediaId: id },
      include: { user: { select: { id: true, username: true, email: true, displayName: true } } },
    });
    accessUsers = accesses.map((a) => ({
      id: a.user.id,
      username: a.user.username,
      email: a.user.email,
      displayName: a.user.displayName,
    }));
  }

  // Favorite check
  const fav = await db.favorite.findUnique({
    where: { userId_mediaId: { userId: ctx.user.id, mediaId: id } },
  });

  // Watch progress for videos
  let watchProgress: number | null = null;
  if (media.type === "video") {
    const wh = await db.watchHistory.findUnique({
      where: { userId_mediaId: { userId: ctx.user.id, mediaId: id } },
      select: { position: true },
    });
    watchProgress = wh?.position ?? null;
  }

  return jsonOk({
    item: {
      id: media.id,
      type: media.type,
      name: media.name,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: Number(media.size),
      visibility: media.visibility,
      status: media.status,
      approvalStatus: media.approvalStatus,
      ownerId: media.ownerId,
      ownerName: media.owner?.displayName ?? media.owner?.username ?? null,
      thumbnailUrl: media.thumbnailPath ? `/api/media/${media.id}/thumbnail` : null,
      streamUrl: media.type === "video" || media.type === "photo" ? `/api/media/${media.id}/stream` : null,
      downloadUrl: `/api/media/${media.id}/download`,
      duration: media.duration,
      width: media.width,
      height: media.height,
      resolution: media.resolution,
      hlsPath: media.hlsPath ? `/api/media/${media.id}/stream?hls=1` : null,
      docType: media.docType,
      contactName: media.contactName,
      contactCount: media.contactCount,
      folderId: media.folderId,
      tags: media.tags?.map((t) => t.tag.name) ?? [],
      createdAt: media.createdAt.toISOString(),
      isFavorite: !!fav,
      watchProgress,
    },
    accessUsers,
  });
}

// DELETE /api/media/[id] - delete media (owner, admin, or user with delete permission who has access)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return jsonError("Not found", 404);

  const isOwner = media.ownerId === ctx.user.id;
  const isAdmin = ctx.user.role === "admin";
  const hasDeletePermission = ctx.user.permissions.includes("delete_own");

  // Admin can delete anything
  if (isAdmin) {
    // proceed
  } else if (isOwner && hasDeletePermission) {
    // Owner can delete their own media if they have delete_own permission
    // proceed
  } else if (!isOwner && hasDeletePermission) {
    // Non-owner with delete permission: check if they have PrivateAccess to this media
    const hasAccess = await db.privateAccess.findUnique({
      where: { mediaId_userId: { mediaId: id, userId: ctx.user.id } },
    });
    if (!hasAccess) {
      return jsonError("You don't have permission to delete this content", 403);
    }
    // proceed — user has delete permission AND private access to this media
  } else if (isOwner && !hasDeletePermission) {
    return jsonError("You don't have delete permission", 403);
  } else {
    return jsonError("You don't have permission to delete this content", 403);
  }

  // Delete file(s)
  await safeDeleteStoragePath(media.storagePath);
  if (media.thumbnailPath) await safeDeleteStoragePath(media.thumbnailPath);
  if (media.hlsPath) await safeDeleteStoragePath(media.hlsPath);

  await db.media.delete({ where: { id } });

  if (isAdmin && !isOwner) {
    await logAdminActivity({
      adminId: ctx.user.id,
      action: "media.delete",
      targetUserId: media.ownerId,
      targetContent: media.name,
      ip: getClientIp(req),
    });
  }

  return jsonOk({ ok: true });
}

// PATCH /api/media/[id] - rename, move folder, change visibility
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return jsonError("Not found", 404);

  const isOwner = media.ownerId === ctx.user.id;
  const isAdmin = ctx.user.role === "admin";

  if (!isOwner && !isAdmin) return jsonError("Not allowed", 403);

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).slice(0, 200);
  if (body.folderId !== undefined) data.folderId = body.folderId;
  if (body.visibility !== undefined && isAdmin) {
    data.visibility = body.visibility === "private" ? "private" : "public";
  }

  await db.media.update({ where: { id }, data });
  return jsonOk({ ok: true });
}
