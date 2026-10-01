import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { logAdminActivity, getClientIp } from "@/lib/auth";

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const settings = await db.systemSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return jsonOk({ settings: map });
}

// PUT /api/admin/settings - bulk update
export async function PUT(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user || ctx.user.role !== "admin") return jsonError("Forbidden", 403);

  const body = await req.json();
  const updates = body.settings as Record<string, string> | undefined;
  if (!updates || typeof updates !== "object") return jsonError("Missing settings", 400);

  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.systemSetting.findUnique({ where: { key } });
    if (existing) {
      await db.systemSetting.update({ where: { key }, data: { value: String(value) } });
    } else {
      await db.systemSetting.create({ data: { key, value: String(value) } });
    }
  }
  await logAdminActivity({
    adminId: ctx.user.id,
    action: "settings.update",
    ip: getClientIp(req),
    metadata: { keys: Object.keys(updates) },
  });
  return jsonOk({ ok: true });
}
