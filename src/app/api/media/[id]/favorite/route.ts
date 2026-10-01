import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk, canAccessMedia } from "@/lib/api";

// POST /api/media/[id]/favorite - toggles favorite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canSee = await canAccessMedia(ctx.user, id);
  if (!canSee) return jsonError("Not authorized", 403);

  const existing = await db.favorite.findUnique({
    where: { userId_mediaId: { userId: ctx.user.id, mediaId: id } },
  });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return jsonOk({ isFavorite: false });
  } else {
    await db.favorite.create({ data: { userId: ctx.user.id, mediaId: id } });
    return jsonOk({ isFavorite: true });
  }
}
