import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

// GET /api/admin/logs - list admin activity log
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? undefined;
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10)));

  const where: any = {};
  if (action) where.action = { contains: action };

  const logs = await db.adminActivityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { admin: { select: { username: true, email: true, displayName: true } }, target: { select: { username: true, displayName: true } } },
  });

  return jsonOk({
    logs: logs.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      adminName: l.admin?.displayName ?? l.admin?.username ?? "—",
      adminEmail: l.admin?.email ?? "",
      targetUserId: l.targetUserId,
      targetUserName: l.target?.displayName ?? l.target?.username ?? null,
      action: l.action,
      targetContent: l.targetContent,
      metadata: l.metadata ? safeParse(l.metadata) : null,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
  });
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

// DELETE /api/admin/logs - clear logs older than N days
export async function DELETE(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const url = new URL(req.url);
  const days = Math.max(0, parseInt(url.searchParams.get("days") ?? "30", 10));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await db.adminActivityLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return jsonOk({ deleted: result.count });
}
