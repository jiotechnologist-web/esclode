import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk, canAccessMedia, canDownloadMedia } from "@/lib/api";
import { resolveStoragePath } from "@/lib/storage";
import { promises as fs } from "fs";
import { rangeHeaderToParts } from "@/lib/media";
import { getClientIp } from "@/lib/auth";

// GET /api/media/[id]/thumbnail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canSee = await canAccessMedia(ctx.user, id);
  if (!canSee) return jsonError("Not authorized to view this media", 403);

  const media = await db.media.findUnique({ where: { id } });
  if (!media || !media.thumbnailPath) {
    // No thumbnail; return a default SVG placeholder
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#1f2937"/><text x="160" y="100" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">No preview</text></svg>`,
      { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, max-age=300" } }
    );
  }
  try {
    const abs = resolveStoragePath(media.thumbnailPath);
    const buf = await fs.readFile(abs);
    return new Response(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#1f2937"/><text x="160" y="100" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">No preview</text></svg>`,
      { headers: { "Content-Type": "image/svg+xml" } }
    );
  }
}
