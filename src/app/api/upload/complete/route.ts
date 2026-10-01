import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { resolveStoragePath, getMediaTypeDir, getStorageRelativePath } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";
import { ensureThumbnailForImage, generatePhotoMetadata } from "@/lib/media";

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

    if (upload.receivedChunks < upload.totalChunks) {
      return jsonError("Not all chunks received", 400);
    }

    // Move the file from temp to permanent location (ONE file, ONE media record)
    const tmpAbs = resolveStoragePath(upload.storagePath);
    const dir = getMediaTypeDir(upload.mediaType as any);
    await fs.mkdir(dir, { recursive: true });
    const ext = upload.filename.includes(".") ? upload.filename.slice(upload.filename.lastIndexOf(".")) : "";
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const finalAbs = path.join(dir, finalName);
    const finalRel = getStorageRelativePath(finalAbs);
    await fs.rename(tmpAbs, finalAbs);

    // Generate thumbnail for images
    let thumbRel: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;
    if (upload.mediaType === "photo") {
      try {
        const meta = await generatePhotoMetadata(finalAbs);
        width = meta.width;
        height = meta.height;
        thumbRel = await ensureThumbnailForImage(upload.id, finalAbs, ext);
      } catch (e) {
        console.error("Thumbnail generation failed", e);
      }
    } else if (upload.mediaType === "video") {
      try {
        const { generateVideoThumbnail } = await import("@/lib/video-thumb");
        const result = await generateVideoThumbnail(finalAbs, upload.id);
        thumbRel = result.thumbnailRel || null;
        duration = result.duration;
        width = result.width;
        height = result.height;
      } catch (e) {
        console.error("Video thumbnail generation failed", e);
      }
    }

    // Determine approval status
    const owner = await db.user.findUnique({ where: { id: upload.userId } });
    const approvalStatus = owner?.approvalRequired ? "pending" : "approved";
    const status = approvalStatus === "pending" ? "pending" : "ready";

    // Create ONE media record
    const media = await db.media.create({
      data: {
        type: upload.mediaType,
        name: upload.filename.replace(/\.[^.]+$/, ""),
        originalName: upload.filename,
        mimeType: upload.mimeType,
        size: upload.fileSize,
        visibility: body.visibility === "private" ? "private" : "public",
        status,
        approvalStatus,
        ownerId: upload.userId,
        storagePath: finalRel,
        thumbnailPath: thumbRel,
        width,
        height,
        duration,
        docType: upload.mediaType === "document" ? inferDocType(upload.filename) : null,
      },
    });

    // Assign private access to multiple users (one media, many access records)
    if (media.visibility === "private" && Array.isArray(body.assignUserIds)) {
      const ids = (body.assignUserIds as string[])
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i);
      for (const uid of ids) {
        try {
          const existing = await db.privateAccess.findUnique({
            where: { mediaId_userId: { mediaId: media.id, userId: uid } },
          });
          if (!existing) {
            await db.privateAccess.create({
              data: { mediaId: media.id, userId: uid, grantedBy: ctx.user!.id },
            });
          }
        } catch (e) {
          // Ignore duplicates
        }
      }
    }

    // Mark upload completed
    await db.upload.update({
      where: { id: upload.id },
      data: { status: "completed", completedAt: new Date(), mediaId: media.id },
    });

    // Record daily usage
    const today = new Date().toISOString().slice(0, 10);
    const existing = await db.dailyUsage.findUnique({
      where: { userId_date: { userId: upload.userId, date: today } },
    });
    if (existing) {
      await db.dailyUsage.update({
        where: { id: existing.id },
        data: { uploadBytes: existing.uploadBytes + upload.fileSize, uploadCount: existing.uploadCount + 1 },
      });
    } else {
      await db.dailyUsage.create({
        data: { userId: upload.userId, date: today, uploadBytes: upload.fileSize, uploadCount: 1 },
      });
    }

    return jsonOk({
      mediaId: media.id,
      media: {
        id: media.id,
        type: media.type,
        name: media.name,
        originalName: media.originalName,
        mimeType: media.mimeType,
        size: Number(media.size),
        visibility: media.visibility,
        status: media.status,
        approvalStatus: media.approvalStatus,
        ownerId: media.ownerId,
        thumbnailUrl: thumbRel ? `/api/media/${media.id}/thumbnail` : null,
        streamUrl: media.type === "video" || media.type === "photo" ? `/api/media/${media.id}/stream` : null,
        downloadUrl: `/api/media/${media.id}/download`,
        duration: media.duration,
        width: media.width,
        height: media.height,
        resolution: media.resolution,
        hlsPath: media.hlsPath,
        docType: media.docType,
        contactName: media.contactName,
        contactCount: media.contactCount,
        folderId: media.folderId,
        tags: [],
        createdAt: media.createdAt.toISOString(),
        isFavorite: false,
      },
    });
  } catch (e: any) {
    console.error("Upload complete failed:", e);
    return jsonError(e?.message ?? "Upload complete failed", 500);
  }
}

function inferDocType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "pdf",
    doc: "doc",
    docx: "docx",
    xls: "xls",
    xlsx: "xlsx",
    ppt: "ppt",
    pptx: "pptx",
    txt: "txt",
    csv: "csv",
    zip: "zip",
    rar: "rar",
    "7z": "7z",
    apk: "apk",
  };
  return map[ext] ?? "other";
}
