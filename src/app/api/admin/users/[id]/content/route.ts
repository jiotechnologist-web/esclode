import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

// GET /api/admin/users/[id]/content - admin fetches all media for a specific user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  const where: any = { ownerId: id };
  if (type) where.type = type;
  if (search) where.name = { contains: search };

  const items = await db.media.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
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
      visibility: m.visibility,
      status: m.status,
      approvalStatus: m.approvalStatus,
      ownerId: m.ownerId,
      thumbnailUrl: m.thumbnailPath ? `/api/media/${m.id}/thumbnail` : null,
      streamUrl: m.type === "video" || m.type === "photo" ? `/api/media/${m.id}/stream` : null,
      downloadUrl: `/api/media/${m.id}/download`,
      duration: m.duration,
      width: m.width,
      height: m.height,
      docType: m.docType,
      contactName: m.contactName,
      contactCount: m.contactCount,
      folderId: m.folderId,
      tags: m.tags.map((t) => t.tag.name),
      createdAt: m.createdAt.toISOString(),
      isFavorite: false,
    })),
  });
}
