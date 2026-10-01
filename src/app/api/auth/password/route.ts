import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, logAdminActivity, getClientIp } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  try {
    const body = await req.json();
    const current = String(body.current ?? "");
    const next = String(body.next ?? "");
    if (!current || !next) return jsonError("Missing fields", 400);
    if (next.length < 6) return jsonError("Password too short (min 6 chars)", 400);

    const user = await db.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) return jsonError("User not found", 404);

    const ok = await verifyPassword(current, user.passwordHash);
    if (!ok) return jsonError("Current password incorrect", 401);

    const hash = await hashPassword(next);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, mustChangePwd: false },
    });

    if (ctx.user.role === "admin") {
      await logAdminActivity({
        adminId: ctx.user.id,
        action: "admin.password.change",
        ip: getClientIp(req),
      });
    }

    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to change password", 500);
  }
}
