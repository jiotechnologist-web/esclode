import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

// POST /api/media/[id]/access - assign private access to users
export async function POST(
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
  if (media.visibility !== "private" && !isAdmin) return jsonError("Media is not private", 400);

  const body = await req.json();
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
  const action = body.action === "remove" ? "remove" : "add";

  if (action === "add") {
    // First switch media to private if admin requested it
    if (body.makePrivate && isAdmin) {
      await db.media.update({ where: { id }, data: { visibility: "private" } });
    }
    // Insert PrivateAccess records using a loop with upsert to enforce
    // the unique(mediaId, userId) constraint across SQLite/Postgres.
    // Also dedupe userIds within the request to avoid duplicate insert attempts.
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    for (const uid of uniqueIds) {
      try {
        const existing = await db.privateAccess.findUnique({
          where: { mediaId_userId: { mediaId: id, userId: uid } },
        });
        if (!existing) {
          await db.privateAccess.create({
            data: { mediaId: id, userId: uid, grantedBy: ctx.user.id },
          });
        }
      } catch (e) {
        // Ignore concurrent inserts that violate the unique constraint
      }
    }
  } else {
    if (userIds.length > 0) {
      await db.privateAccess.deleteMany({
        where: { mediaId: id, userId: { in: userIds } },
      });
    }
  }

  return jsonOk({ ok: true });
}

// GET /api/media/[id]/access - list users with access to this media
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return jsonError("Not found", 404);
  const isOwner = media.ownerId === ctx.user.id;
  if (!isOwner && ctx.user.role !== "admin") return jsonError("Not allowed", 403);

  const accesses = await db.privateAccess.findMany({
    where: { mediaId: id },
    include: { user: { select: { id: true, username: true, email: true, displayName: true } } },
  });
  return jsonOk({
    users: accesses.map((a) => ({
      id: a.user.id,
      username: a.user.username,
      email: a.user.email,
      displayName: a.user.displayName,
      grantedAt: a.grantedAt.toISOString(),
    })),
  });
}
