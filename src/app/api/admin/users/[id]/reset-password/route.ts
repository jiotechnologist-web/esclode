import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { hashPassword, logAdminActivity, getClientIp } from "@/lib/auth";

// POST /api/admin/users/[id]/reset-password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);
  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return jsonError("Not found", 404);

  const body = await req.json();
  const newPassword = String(body.password ?? "");
  if (newPassword.length < 6) return jsonError("Password too short (min 6)", 400);

  await db.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(newPassword),
      mustChangePwd: !!body.mustChange,
    },
  });
  await logAdminActivity({
    adminId: ctx.user.id,
    action: "user.password.reset",
    targetUserId: id,
    ip: getClientIp(req),
    metadata: { forced: !!body.mustChange },
  });
  return jsonOk({ ok: true });
}
