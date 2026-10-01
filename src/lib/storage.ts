import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

// Use an explicit writable path when provided. Otherwise keep storage inside
// the application working directory, which is portable across Hostinger and
// local Node.js deployments.
const STORAGE_ROOT = path.resolve(
  process.env.ESCLLOUD_STORAGE_ROOT?.trim() || path.join(process.cwd(), "storage")
);

export const PATHS = {
  ROOT: STORAGE_ROOT,
  VIDEOS: path.join(STORAGE_ROOT, "videos"),
  PHOTOS: path.join(STORAGE_ROOT, "photos"),
  DOCUMENTS: path.join(STORAGE_ROOT, "documents"),
  CONTACTS: path.join(STORAGE_ROOT, "contacts"),
  THUMBNAILS: path.join(STORAGE_ROOT, "thumbnails"),
  HLS: path.join(STORAGE_ROOT, "hls"),
  UPLOADS: path.join(STORAGE_ROOT, "uploads"),
  AVATARS: path.join(STORAGE_ROOT, "avatars"),
  TMP: path.join(STORAGE_ROOT, "tmp"),
};

export async function ensureStorageDirs() {
  for (const p of Object.values(PATHS)) {
    try {
      await fs.mkdir(p, { recursive: true });
    } catch (e) {
      // Directory creation errors are surfaced when a file operation actually
      // needs the directory. This keeps app startup resilient.
    }
  }
}

let initPromise: Promise<void> | null = null;
export function initStorage() {
  if (!initPromise) initPromise = ensureStorageDirs();
  return initPromise;
}
initStorage();

export function safeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 200);
}

export function randomFilename(ext: string): string {
  return `${randomBytes(16).toString("hex")}${ext ? (ext.startsWith(".") ? ext : "." + ext) : ""}`;
}

export function resolveStoragePath(relative: string): string {
  const root = path.resolve(STORAGE_ROOT);
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal detected");
  }
  return target;
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function getFileSize(p: string): Promise<number> {
  try {
    const stat = await fs.stat(p);
    return stat.size;
  } catch {
    return 0;
  }
}

export async function deleteFile(p: string): Promise<void> {
  try {
    await fs.unlink(p);
  } catch {}
}

export async function safeDeleteStoragePath(relative: string): Promise<void> {
  if (!relative) return;
  try {
    const abs = resolveStoragePath(relative);
    await fs.unlink(abs);
  } catch {}
}

export type MediaType = "video" | "photo" | "document" | "contact";

const MIME_MAP: { type: MediaType; exts: string[]; mimes: string[] }[] = [
  {
    type: "video",
    exts: ["mp4", "mov", "avi", "mkv", "webm", "m4v", "flv", "wmv", "3gp", "mpeg", "mpg"],
    mimes: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/x-flv", "video/3gpp"],
  },
  {
    type: "photo",
    exts: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "tiff", "tif", "svg", "avif"],
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/heic", "image/heif", "image/tiff", "image/svg+xml", "image/avif"],
  },
  {
    type: "contact",
    exts: ["vcf", "vcard"],
    mimes: ["text/vcard", "text/x-vcard"],
  },
  {
    type: "document",
    exts: [
      "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "zip", "rar", "7z", "tar", "gz", "bz2", "xz", "apk", "epub", "djvu", "rtf", "odt", "ods", "odp",
    ],
    mimes: [
      "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain", "text/csv", "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
      "application/x-tar", "application/gzip", "application/x-bzip2", "application/x-xz", "application/vnd.android.package-archive",
      "application/epub+zip", "image/vnd.djvu", "application/rtf", "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet", "application/vnd.oasis.opendocument.presentation",
    ],
  },
];

const DOC_TYPE_MAP: Record<string, string> = {
  pdf: "pdf", doc: "doc", docx: "docx", xls: "xls", xlsx: "xlsx", ppt: "ppt", pptx: "pptx",
  txt: "txt", csv: "csv", zip: "zip", rar: "rar", "7z": "7z", tar: "other", gz: "other",
  bz2: "other", xz: "other", apk: "apk", epub: "other", djvu: "other", rtf: "other", odt: "other",
  ods: "other", odp: "other",
};

export function categorizeFile(filename: string, mime?: string): { type: MediaType; docType?: string; ext: string } {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime) {
    for (const entry of MIME_MAP) {
      if (entry.mimes.some((m) => mime.toLowerCase() === m || mime.toLowerCase().startsWith(m + ";"))) {
        return { type: entry.type, docType: entry.type === "document" ? (DOC_TYPE_MAP[ext] ?? "other") : undefined, ext };
      }
    }
  }
  for (const entry of MIME_MAP) {
    if (entry.exts.includes(ext)) {
      return { type: entry.type, docType: entry.type === "document" ? (DOC_TYPE_MAP[ext] ?? "other") : undefined, ext };
    }
  }
  return { type: "document", docType: "other", ext };
}

export function getMediaTypeDir(type: MediaType): string {
  switch (type) {
    case "video": return PATHS.VIDEOS;
    case "photo": return PATHS.PHOTOS;
    case "document": return PATHS.DOCUMENTS;
    case "contact": return PATHS.CONTACTS;
  }
}

export function getStorageRelativePath(abs: string): string {
  return path.relative(STORAGE_ROOT, abs);
}

export async function getAllowedStoragePath(type: MediaType, filename: string): Promise<{ abs: string; rel: string }> {
  const dir = getMediaTypeDir(type);
  await fs.mkdir(dir, { recursive: true });
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const safe = randomFilename(ext);
  const abs = path.join(dir, safe);
  const rel = path.relative(STORAGE_ROOT, abs);
  return { abs, rel };
}
