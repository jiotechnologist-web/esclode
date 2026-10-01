import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";
import { PATHS, safeFilename } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

// POST /api/profile/avatar — upload profile picture
export async function POST(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return jsonError("Missing file", 400);
  if (!file.type.startsWith("image/")) return jsonError("Not an image", 400);
  if (file.size > 5 * 1024 * 1024) return jsonError("Avatar too large (max 5MB)", 413);

  try {
    await fs.mkdir(PATHS.AVATARS, { recursive: true });
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".jpg";
    const safe = randomBytes(16).toString("hex") + ext;
    const abs = path.join(PATHS.AVATARS, safe);
    await fs.writeFile(abs, buf);
    const rel = path.relative(PATHS.ROOT, abs);

    const user = await db.user.findUnique({ where: { id: ctx.user.id } });
    if (user?.avatarPath) {
      try {
        const oldAbs = path.resolve(PATHS.ROOT, user.avatarPath);
        await fs.unlink(oldAbs);
      } catch {}
    }

    await db.user.update({ where: { id: ctx.user.id }, data: { avatarPath: rel } });
    return jsonOk({ ok: true, avatarUrl: `/api/profile/avatar?path=${encodeURIComponent(rel)}` });
  } catch (e: any) {
    return jsonError(e?.message ?? "Avatar upload failed", 500);
  }
}

// GET /api/profile/avatar?path=...
export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);
  const url = new URL(req.url);
  const rel = url.searchParams.get("path") ?? "";
  if (!rel) return jsonError("Missing path", 400);
  try {
    const abs = path.resolve(PATHS.ROOT, rel);
    if (!abs.startsWith(PATHS.ROOT)) return jsonError("Forbidden", 403);
    const buf = await fs.readFile(abs);
    return new Response(buf, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return jsonError("Not found", 404);
  }
}
