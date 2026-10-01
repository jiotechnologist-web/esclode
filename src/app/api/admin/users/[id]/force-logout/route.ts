import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { destroyAllUserSessions, logAdminActivity, getClientIp } from "@/lib/auth";

// POST /api/admin/users/[id]/force-logout
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return jsonError("Not found", 404);

  await destroyAllUserSessions(id);
  await logAdminActivity({
    adminId: ctx.user.id,
    action: "user.force_logout",
    targetUserId: id,
    ip: getClientIp(req),
  });
  return jsonOk({ ok: true });
}
