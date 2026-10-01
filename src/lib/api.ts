import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getImpersonatingAdmin, AuthUser } from "./auth";
import { db } from "./db";
import { hasPermission } from "./permissions";

export interface RequestContext {
  req: NextRequest;
  user: AuthUser | null;
  impersonatingAdmin: AuthUser | null;
  isImpersonating: boolean;
}

export async function getRequestContext(req: NextRequest): Promise<RequestContext> {
  const user = await getCurrentUser();
  const impersonatingAdmin = await getImpersonatingAdmin();
  return {
    req,
    user,
    impersonatingAdmin,
    isImpersonating: !!impersonatingAdmin,
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function requireAuth(ctx: RequestContext): AuthUser | null {
  return ctx.user;
}

export function requireAdmin(ctx: RequestContext): AuthUser | null {
  if (!ctx.user || ctx.user.role !== "admin") return null;
  return ctx.user;
}

export function checkPermission(user: AuthUser | null, perm: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return hasPermission(user.permissions, perm);
}

export async function canAccessMedia(
  user: AuthUser | null,
  mediaId: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return false;
  if (media.ownerId === user.id) return true;
  if (media.visibility === "public") {
    const permMap: Record<string, string> = {
      video: "view_videos",
      photo: "view_photos",
      document: "view_documents",
      contact: "view_contacts",
    };
    return hasPermission(user.permissions, permMap[media.type] ?? "");
  }
  if (media.visibility === "private") {
    if (!hasPermission(user.permissions, "view_private")) return false;
    const access = await db.privateAccess.findUnique({
      where: { mediaId_userId: { mediaId, userId: user.id } },
    });
    return !!access;
  }
  return false;
}

export async function canDownloadMedia(
  user: AuthUser | null,
  mediaId: string
): Promise<boolean> {
  if (!user) return false;
  if (user.role === "admin") return true;
  const canView = await canAccessMedia(user, mediaId);
  if (!canView) return false;
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return false;
  if (media.ownerId === user.id) return true;
  if (!user.downloadEnabled) return false;
  const permMap: Record<string, string> = {
    video: "download_videos",
    photo: "download_photos",
    document: "download_documents",
    contact: "download_contacts",
  };
  return hasPermission(user.permissions, permMap[media.type] ?? "");
}

// Build a media list query for an authorized user
export function buildMediaQueryForUser(user: AuthUser | null) {
  // For admin: everything
  if (user?.role === "admin") {
    return {};
  }
  if (!user) return { id: "__none__" };
  // public media (within user's view permissions) OR owned by user OR explicitly assigned private
  return {
    OR: [
      { ownerId: user.id },
      {
        visibility: "public",
        type: { in: allowedTypesForUser(user) },
      },
      {
        visibility: "private",
        id: {
          in: {
            select: { mediaId: true },
            where: { userId: user.id },
          } as any,
        },
      },
    ],
  };
}

function allowedTypesForUser(user: AuthUser): string[] {
  const types: string[] = [];
  if (hasPermission(user.permissions, "view_videos")) types.push("video");
  if (hasPermission(user.permissions, "view_photos")) types.push("photo");
  if (hasPermission(user.permissions, "view_documents")) types.push("document");
  if (hasPermission(user.permissions, "view_contacts")) types.push("contact");
  if (hasPermission(user.permissions, "view_private")) {
    // private content is handled via PrivateAccess join
  }
  return types;
}
