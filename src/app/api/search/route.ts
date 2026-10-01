import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";

// GET /api/search?q=hello&type=video
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const type = url.searchParams.get("type") ?? undefined;
  if (q.length < 1) return jsonOk({ items: [] });

  const allowedTypes: string[] = [];
  if (hasPermission(ctx.user.permissions, "view_videos")) allowedTypes.push("video");
  if (hasPermission(ctx.user.permissions, "view_photos")) allowedTypes.push("photo");
  if (hasPermission(ctx.user.permissions, "view_documents")) allowedTypes.push("document");
  if (hasPermission(ctx.user.permissions, "view_contacts")) allowedTypes.push("contact");
  const canPrivate = hasPermission(ctx.user.permissions, "view_private");

  const where: any = {
    AND: [
      { name: { contains: q } },
    ],
  };
  if (type) {
    if (!allowedTypes.includes(type)) return jsonOk({ items: [] });
    where.AND.push({ type });
  } else if (ctx.user.role !== "admin") {
    where.AND.push({ type: { in: allowedTypes } });
  }
  if (ctx.user.role !== "admin") {
    const orClauses: any[] = [{ ownerId: ctx.user.id }];
    if (allowedTypes.length > 0) {
      orClauses.push({ visibility: "public", type: { in: allowedTypes } });
    }
    if (canPrivate) {
      orClauses.push({ visibility: "private", privateAccess: { some: { userId: ctx.user.id } } });
    }
    where.AND.push({ OR: orClauses });
  }

  const items = await db.media.findMany({
    where,
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { tags: { include: { tag: true } } },
  });

  return jsonOk({
    items: items.map((m) => ({
      id: m.id,
      type: m.type,
      name: m.name,
      originalName: m.originalName,
      mimeType: m.mimeType,
      size: Number(m.size),
      thumbnailUrl: m.thumbnailPath ? `/api/media/${m.id}/thumbnail` : null,
      streamUrl: m.type === "video" || m.type === "photo" ? `/api/media/${m.id}/stream` : null,
      downloadUrl: `/api/media/${m.id}/download`,
      docType: m.docType,
      duration: m.duration,
      width: m.width,
      height: m.height,
      visibility: m.visibility,
      createdAt: m.createdAt.toISOString(),
      tags: m.tags.map((t) => t.tag.name),
    })),
  });
}
