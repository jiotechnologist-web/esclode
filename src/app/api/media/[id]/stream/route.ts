import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, canAccessMedia } from "@/lib/api";
import { resolveStoragePath } from "@/lib/storage";
import { promises as fs } from "fs";
import { rangeHeaderToParts } from "@/lib/media";

// GET /api/media/[id]/stream — supports HTTP Range requests for video/audio
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canSee = await canAccessMedia(ctx.user, id);
  if (!canSee) return jsonError("Not authorized", 403);

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return jsonError("Not found", 404);
  if (media.status !== "ready" && ctx.user.role !== "admin") {
    return jsonError("Media not ready", 409);
  }

  try {
    const abs = resolveStoragePath(media.storagePath);
    const stat = await fs.stat(abs);
    const total = stat.size;
    const range = req.headers.get("range");
    const parts = rangeHeaderToParts(range, total);

    if (parts) {
      const { start, end } = parts;
      const length = end - start + 1;
      const stream = (await fs.open(abs, "r")).createReadStream({ start, end });
      const headers = new Headers();
      headers.set("Content-Range", `bytes ${start}-${end}/${total}`);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(length));
      headers.set("Content-Type", media.mimeType || "application/octet-stream");
      headers.set("Cache-Control", "private, max-age=600");
      return new Response(stream as any, { status: 206, headers });
    } else {
      const stream = (await fs.open(abs, "r")).createReadStream();
      const headers = new Headers();
      headers.set("Content-Length", String(total));
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Type", media.mimeType || "application/octet-stream");
      headers.set("Cache-Control", "private, max-age=600");
      return new Response(stream as any, { status: 200, headers });
    }
  } catch (e: any) {
    return jsonError(e?.message ?? "Stream failed", 500);
  }
}
