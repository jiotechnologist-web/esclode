import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const [
    totalUsers, activeUsers, suspendedUsers,
    totalVideos, totalPhotos, totalDocuments, totalContacts,
    privateFiles, pendingUploads, totalDownloadRecords,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { status: "active", role: "user" } }),
    db.user.count({ where: { status: "suspended" } }),
    db.media.count({ where: { type: "video" } }),
    db.media.count({ where: { type: "photo" } }),
    db.media.count({ where: { type: "document" } }),
    db.media.count({ where: { type: "contact" } }),
    db.media.count({ where: { visibility: "private" } }),
    db.upload.count({ where: { status: "uploading" } }),
    db.downloadRecord.count(),
  ]);

  // Storage stats
  const videoAgg = await db.media.aggregate({ where: { type: "video" }, _sum: { size: true } });
  const photoAgg = await db.media.aggregate({ where: { type: "photo" }, _sum: { size: true } });
  const docAgg = await db.media.aggregate({ where: { type: "document" }, _sum: { size: true } });
  const contactAgg = await db.media.aggregate({ where: { type: "contact" }, _sum: { size: true } });
  const storageUsed = Number(videoAgg._sum.size ?? 0) + Number(photoAgg._sum.size ?? 0) + Number(docAgg._sum.size ?? 0) + Number(contactAgg._sum.size ?? 0);

  // Upload stats by day (last 14)
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const uploads = await db.upload.findMany({
    where: { startedAt: { gte: since } },
    select: { startedAt: true, fileSize: true },
  });
  const downloads = await db.downloadRecord.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, bytes: true },
  });
  function bucket(items: any[], dateKey: string, sizeKey: string) {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const i of items) {
      const d = new Date(i[dateKey]).toISOString().slice(0, 10);
      const cur = map.get(d) ?? { count: 0, bytes: 0 };
      cur.count += 1;
      cur.bytes += Number(i[sizeKey] ?? 0);
      map.set(d, cur);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }));
  }
  const uploadsByDay = bucket(uploads, "startedAt", "fileSize");
  const downloadsByDay = bucket(downloads, "createdAt", "bytes");

  // Storage by type
  const storageByType = [
    { type: "video", bytes: Number(videoAgg._sum.size ?? 0), count: totalVideos },
    { type: "photo", bytes: Number(photoAgg._sum.size ?? 0), count: totalPhotos },
    { type: "document", bytes: Number(docAgg._sum.size ?? 0), count: totalDocuments },
    { type: "contact", bytes: Number(contactAgg._sum.size ?? 0), count: totalContacts },
  ];

  // Total user quota (sum of quotas across users)
  const totalQuotaAgg = await db.user.aggregate({ _sum: { storageQuota: true } });
  const totalQuota = Number(totalQuotaAgg._sum.storageQuota ?? 0);
  const storageRemaining = Math.max(0, totalQuota - storageUsed);

  // total uploads
  const totalUploads = await db.upload.count();

  return jsonOk({
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalVideos,
    totalPhotos,
    totalDocuments,
    totalContacts,
    privateFiles,
    storageUsed,
    storageRemaining,
    pendingUploads,
    totalDownloads: totalDownloadRecords,
    totalUploads,
    uploadsByDay,
    downloadsByDay,
    storageByType,
  });
}
