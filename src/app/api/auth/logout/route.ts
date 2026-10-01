import { NextRequest } from "next/server";
import { destroySession, logAdminActivity, getClientIp } from "@/lib/auth";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonOk({ ok: true });
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("escloud_session")?.value;
    if (token) await destroySession(token);

    const impToken = cookieStore.get("escloud_impersonation")?.value;
    if (impToken) {
      try {
        await db.impersonation.update({
          where: { token: impToken },
          data: { endedAt: new Date() },
        });
      } catch {}
      cookieStore.delete("escloud_impersonation");
    }

    cookieStore.delete("escloud_session");

    if (ctx.user.role === "admin") {
      await logAdminActivity({
        adminId: ctx.user.id,
        action: "admin.logout",
        ip: getClientIp(req),
      });
    }

    return jsonOk({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message ?? "Logout failed", 500);
  }
}
