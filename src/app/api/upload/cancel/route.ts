import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { safeDeleteStoragePath } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  try {
    const body = await req.json();
    const uploadId = String(body.uploadId ?? "");
    if (!uploadId) return jsonError("Missing uploadId", 400);
    const upload = await db.upload.findUnique({ where: { id: uploadId } });
    if (!upload) return jsonError("Upload not found", 404);
    if (upload.userId !== ctx.user.id && ctx.user.role !== "admin") {
      return jsonError("Not allowed", 403);
    }
    await safeDeleteStoragePath(upload.storagePath);
    await db.upload.update({
      where: { id: upload.id },
      data: { status: "cancelled" },
    });
    await db.uploadChunk.deleteMany({ where: { uploadId } });
    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Cancel failed", 500);
  }
}

// List user's uploads (in-progress)
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const list = await db.upload.findMany({
    where: { userId: ctx.user.id, status: { in: ["uploading", "waiting", "paused", "failed"] } },
    orderBy: { startedAt: "desc" },
  });
  return jsonOk({
    uploads: list.map((u) => ({
      id: u.id,
      filename: u.filename,
      fileSize: Number(u.fileSize),
      mimeType: u.mimeType,
      mediaType: u.mediaType,
      totalChunks: u.totalChunks,
      receivedChunks: u.receivedChunks,
      status: u.status,
      progress: u.totalChunks > 0 ? u.receivedChunks / u.totalChunks : 0,
      startedAt: u.startedAt.toISOString(),
    })),
  });
}
