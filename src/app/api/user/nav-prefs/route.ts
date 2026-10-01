import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getRequestContext, jsonError, jsonOk } from "@/lib/api";

// All possible primary nav items for users
export const ALL_USER_NAV_ITEMS = [
  "home", "videos", "photos", "private", "documents", "contacts",
  "uploads", "favorites", "recent", "profile",
] as const;

// Items that must always remain accessible (cannot be hidden)
export const REQUIRED_NAV_ITEMS = ["home", "profile"] as const;

// Default video prefs — preloadVideos defaults to TRUE per requirement #1
const DEFAULT_VIDEO_PREFS = {
  preloadVideos: true,
  advancedVideoPlay: true,
  preferredQuality: "auto",
  autoQuality: true,
  preBufferLevel: "adaptive",
  dataSaver: false,
};

export async function GET(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);

  let pref = await db.userNavPref.findUnique({ where: { userId: ctx.user.id } });
  if (!pref) {
    // Create defaults with preloadVideos=true
    pref = await db.userNavPref.create({
      data: { userId: ctx.user.id, primaryItems: "[]", hiddenItems: "[]", ...DEFAULT_VIDEO_PREFS },
    });
  }

  return jsonOk({
    primaryItems: safeParse(pref.primaryItems),
    hiddenItems: safeParse(pref.hiddenItems),
    preloadVideos: pref.preloadVideos,
    advancedVideoPlay: pref.advancedVideoPlay,
    preferredQuality: pref.preferredQuality,
    autoQuality: pref.autoQuality,
    preBufferLevel: pref.preBufferLevel,
    dataSaver: pref.dataSaver,
    reelsEnabled: pref.reelsEnabled,
    videoRotation: pref.videoRotation,
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await getRequestContext(req);
  if (!ctx.user) return jsonError("Not authenticated", 401);

  try {
    const body = await req.json();

    const primaryItems = Array.isArray(body.primaryItems) ? body.primaryItems.filter((x: any) => typeof x === "string") : undefined;
    if (primaryItems && primaryItems.length > 5) {
      return jsonError("Maximum 5 primary navigation items allowed", 400);
    }

    const hiddenItems = Array.isArray(body.hiddenItems) ? body.hiddenItems.filter((x: any) => typeof x === "string") : undefined;
    if (hiddenItems) {
      for (const req of REQUIRED_NAV_ITEMS) {
        if (hiddenItems.includes(req)) {
          return jsonError(`"${req}" cannot be hidden — it's a required navigation item`, 400);
        }
      }
    }

    const data: any = {};
    if (primaryItems) data.primaryItems = JSON.stringify(primaryItems);
    if (hiddenItems) data.hiddenItems = JSON.stringify(hiddenItems);
    if (typeof body.preloadVideos === "boolean") data.preloadVideos = body.preloadVideos;
    if (typeof body.advancedVideoPlay === "boolean") data.advancedVideoPlay = body.advancedVideoPlay;
    if (typeof body.preferredQuality === "string") data.preferredQuality = body.preferredQuality;
    if (typeof body.autoQuality === "boolean") data.autoQuality = body.autoQuality;
    if (typeof body.preBufferLevel === "string") data.preBufferLevel = body.preBufferLevel;
    if (typeof body.dataSaver === "boolean") data.dataSaver = body.dataSaver;
    if (typeof body.reelsEnabled === "boolean") data.reelsEnabled = body.reelsEnabled;
    if (typeof body.videoRotation === "number") data.videoRotation = body.videoRotation;

    const pref = await db.userNavPref.upsert({
      where: { userId: ctx.user.id },
      update: data,
      create: { userId: ctx.user.id, ...data },
    });

    return jsonOk({
      primaryItems: safeParse(pref.primaryItems),
      hiddenItems: safeParse(pref.hiddenItems),
      preloadVideos: pref.preloadVideos,
      advancedVideoPlay: pref.advancedVideoPlay,
      preferredQuality: pref.preferredQuality,
      autoQuality: pref.autoQuality,
      preBufferLevel: pref.preBufferLevel,
      dataSaver: pref.dataSaver,
      reelsEnabled: pref.reelsEnabled,
      videoRotation: pref.videoRotation,
    });
  } catch (e: any) {
    return jsonError(e?.message ?? "Failed to save preferences", 500);
  }
}

function safeParse(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
