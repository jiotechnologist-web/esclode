import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, canDownloadMedia } from "@/lib/api";
import { resolveStoragePath, safeFilename } from "@/lib/storage";
import { promises as fs } from "fs";
import { getClientIp } from "@/lib/auth";

// GET /api/media/[id]/download
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const canDl = await canDownloadMedia(ctx.user, id);
  if (!canDl) return jsonError("Not authorized to download", 403);

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return jsonError("Not found", 404);
  if (media.status !== "ready" && ctx.user.role !== "admin") {
    return jsonError("Media not ready", 409);
  }

  try {
    const abs = resolveStoragePath(media.storagePath);
    const stat = await fs.stat(abs);
    const buf = await fs.readFile(abs);
    const filename = safeFilename(media.originalName);
    const headers = new Headers();
    headers.set("Content-Type", media.mimeType || "application/octet-stream");
    headers.set("Content-Length", String(stat.size));
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "private, no-store");

    // Record download
    try {
      await db.downloadRecord.create({
        data: {
          userId: ctx.user.id,
          mediaId: media.id,
          bytes: BigInt(stat.size),
          ip: getClientIp(req),
          userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
        },
      });
      // Daily usage
      const today = new Date().toISOString().slice(0, 10);
      const existing = await db.dailyUsage.findUnique({
        where: { userId_date: { userId: ctx.user.id, date: today } },
      });
      if (existing) {
        await db.dailyUsage.update({
          where: { id: existing.id },
          data: {
            downloadBytes: existing.downloadBytes + BigInt(stat.size),
            downloadCount: existing.downloadCount + 1,
          },
        });
      } else {
        await db.dailyUsage.create({
          data: { userId: ctx.user.id, date: today, downloadBytes: BigInt(stat.size), downloadCount: 1 },
        });
      }
    } catch {}

    return new Response(buf, { headers });
  } catch (e: any) {
    return jsonError(e?.message ?? "Download failed", 500);
  }
}
