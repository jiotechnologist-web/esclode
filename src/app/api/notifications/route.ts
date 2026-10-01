import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

// GET /api/notifications
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const items = await db.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return jsonOk({
    items: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

// POST /api/notifications/read - mark all as read
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  await db.notification.updateMany({
    where: { userId: ctx.user.id, read: false },
    data: { read: true },
  });
  return jsonOk({ ok: true });
}
