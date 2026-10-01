// Media helpers: thumbnail generation, video metadata, HLS stub, etc.
import { promises as fs } from "fs";
import path from "path";
import { PATHS, resolveStoragePath } from "./storage";
import sharp from "sharp";

const THUMB_SIZE = 480;

export async function generateImageThumbnail(sourceAbs: string, destAbs: string): Promise<void> {
  await sharp(sourceAbs)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "center" })
    .jpeg({ quality: 78 })
    .toFile(destAbs);
}

export async function generatePhotoMetadata(sourceAbs: string) {
  try {
    const meta = await sharp(sourceAbs).metadata();
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
    };
  } catch {
    return { width: null, height: null };
  }
}

export async function getFilePathByMediaRecord(record: { storagePath: string; thumbnailPath: string | null }): Promise<{
  abs: string | null;
  thumbAbs: string | null;
}> {
  if (!record.storagePath) return { abs: null, thumbAbs: null };
  try {
    const abs = resolveStoragePath(record.storagePath);
    const thumbAbs = record.thumbnailPath ? resolveStoragePath(record.thumbnailPath) : null;
    return { abs, thumbAbs };
  } catch {
    return { abs: null, thumbAbs: null };
  }
}

export async function ensureThumbnailForImage(mediaId: string, sourceAbs: string, ext: string): Promise<string> {
  const thumbName = `${mediaId}.jpg`;
  const thumbAbs = path.join(PATHS.THUMBNAILS, thumbName);
  const exists = await fs.stat(thumbAbs).then(() => true).catch(() => false);
  if (!exists) {
    await generateImageThumbnail(sourceAbs, thumbAbs);
  }
  return path.relative(PATHS.ROOT, thumbAbs);
}

export function rangeHeaderToParts(range: string | null, total: number): { start: number; end: number } | null {
  if (!range || !range.startsWith("bytes=")) return null;
  const [startStr, endStr] = range.replace("bytes=", "").split("-");
  const start = startStr ? parseInt(startStr, 10) : 0;
  const end = endStr ? parseInt(endStr, 10) : total - 1;
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (start < 0 || start >= total) return null;
  if (end >= total) return total - 1;
  if (start > end) return null;
  return { start, end };
}
