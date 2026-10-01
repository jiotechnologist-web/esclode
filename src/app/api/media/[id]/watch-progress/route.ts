import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk, canAccessMedia } from "@/lib/api";

// POST /api/media/[id]/watch-progress - record playback progress
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canSee = await canAccessMedia(ctx.user, id);
  if (!canSee) return jsonError("Not authorized", 403);
  try {
    const body = await req.json();
    const position = Number(body.position ?? 0);
    const duration = body.duration ? Number(body.duration) : null;
    const existing = await db.watchHistory.findUnique({
      where: { userId_mediaId: { userId: ctx.user.id, mediaId: id } },
    });
    if (existing) {
      await db.watchHistory.update({
        where: { id: existing.id },
        data: { position, duration: duration ?? existing.duration, updatedAt: new Date() },
      });
    } else {
      await db.watchHistory.create({
        data: { userId: ctx.user.id, mediaId: id, position, duration },
      });
    }
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to save progress", 500);
  }
}
