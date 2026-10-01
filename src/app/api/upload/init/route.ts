import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk, checkPermission } from "@/lib/api";
import { categorizeFile, getStorageRelativePath, PATHS } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";
import { PERMISSIONS } from "@/lib/permissions";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  try {
    const body = await req.json();
    const filename = String(body.filename ?? "");
    const size = Number(body.size ?? 0);
    const mimeType = String(body.mimeType ?? "application/octet-stream");
    const visibility = String(body.visibility ?? "public");
    const targetUserId = String(body.targetUserId ?? ctx.user.id);
    const assignUserIds: string[] = Array.isArray(body.assignUserIds) ? body.assignUserIds : [];

    if (!filename || !size) return jsonError("Missing filename/size", 400);
    if (size <= 0) return jsonError("File is empty", 400);

    const { type } = categorizeFile(filename, mimeType);
    const uploadPermMap: Record<string, string> = {
      video: PERMISSIONS.UPLOAD_VIDEOS,
      photo: PERMISSIONS.UPLOAD_PHOTOS,
      document: PERMISSIONS.UPLOAD_DOCUMENTS,
      contact: PERMISSIONS.UPLOAD_CONTACTS,
    };

    let ownerId = ctx.user.id;
    if (targetUserId !== ctx.user.id) {
      if (ctx.user.role !== "admin") return jsonError("Not allowed", 403);
      ownerId = targetUserId;
    } else {
      if (!ctx.user.uploadEnabled) return jsonError("Upload disabled for this account", 403);
      if (!checkPermission(ctx.user, uploadPermMap[type])) {
        return jsonError(`You don't have permission to upload ${type}s`, 403);
      }
      if (visibility === "private" && !checkPermission(ctx.user, PERMISSIONS.PRIVATE_ACCESS)) {
        return jsonError("You don't have Private Access permission to upload private content", 403);
      }
    }

    const targetUser = await db.user.findUnique({ where: { id: ownerId } });
    if (!targetUser) return jsonError("Target user not found", 404);
    if (targetUser.status !== "active") return jsonError("Target user not active", 403);

    if (size > Number(targetUser.uploadMaxBytes)) {
      return jsonError(`File exceeds max upload size (${formatBytes(Number(targetUser.uploadMaxBytes))})`, 413);
    }

    const used = await db.media.aggregate({ where: { ownerId }, _sum: { size: true } });
    const usedBytes = Number(used._sum.size ?? 0);
    if (usedBytes + size > Number(targetUser.storageQuota)) {
      return jsonError("Storage quota exceeded", 413);
    }

    const today = new Date().toISOString().slice(0, 10);
    const usage = await db.dailyUsage.findUnique({ where: { userId_date: { userId: ownerId, date: today } } });
    const usedToday = Number(usage?.uploadBytes ?? 0);
    if (targetUser.dailyUploadLimit > 0 && usedToday + size > Number(targetUser.dailyUploadLimit)) {
      return jsonError("Daily upload limit exceeded", 413);
    }

    const tmpDir = path.join(PATHS.UPLOADS, "incoming");
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const tmpPath = path.join(tmpDir, tmpName);
    const relTmp = getStorageRelativePath(tmpPath);

    // Pre-create the file
    await fs.writeFile(tmpPath, Buffer.alloc(0));

    const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));

    const upload = await db.upload.create({
      data: {
        userId: ownerId,
        filename,
        fileSize: BigInt(size),
        mimeType,
        mediaType: type,
        totalChunks,
        storagePath: relTmp,
        status: "uploading",
      },
    });

    return jsonOk({
      uploadId: upload.id,
      chunkSize: CHUNK_SIZE,
      totalChunks,
      mediaType: type,
    });
  } catch (e: any) {
    console.error("Upload init failed:", e);
    return jsonError(e?.message ?? "Upload init failed", 500);
  }
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
