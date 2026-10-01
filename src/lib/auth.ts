import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { db } from "./db";
import { cookies } from "next/headers";
import { parsePermissions } from "./permissions";

export const SESSION_COOKIE = "escloud_session";
export const IMPERSONATION_COOKIE = "escloud_impersonation";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const QR_TTL_MS = 1000 * 60 * 3; // 3 minutes for QR

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  status: string;
  avatarPath: string | null;
  permissions: string[];
  storageQuota: number;
  uploadMaxBytes: number;
  uploadEnabled: boolean;
  downloadEnabled: boolean;
  approvalRequired: boolean;
}

export async function getUserByToken(token: string) {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.user.status !== "active") {
    return null;
  }
  return session;
}

export async function createSession(userId: string, meta?: { device?: string; browser?: string; ip?: string }) {
  const token = generateToken(40);
  const session = await db.session.create({
    data: {
      userId,
      token,
      device: meta?.device ?? null,
      browser: meta?.browser ?? null,
      ip: meta?.ip ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, session };
}

export async function destroySession(token: string) {
  try {
    await db.session.deleteMany({ where: { token } });
  } catch {}
}

export async function destroyAllUserSessions(userId: string) {
  try {
    await db.session.deleteMany({ where: { userId } });
  } catch {}
}

export async function touchSession(token: string) {
  try {
    await db.session.update({
      where: { token },
      data: { lastActive: new Date() },
    });
  } catch {}
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getUserByToken(token);
  if (!session) return null;
  await touchSession(token);
  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    role: u.role as "user" | "admin",
    status: u.status,
    avatarPath: u.avatarPath,
    permissions: parsePermissions(u.permissions),
    storageQuota: Number(u.storageQuota),
    uploadMaxBytes: Number(u.uploadMaxBytes),
    uploadEnabled: u.uploadEnabled,
    downloadEnabled: u.downloadEnabled,
    approvalRequired: u.approvalRequired,
  };
}

export async function getImpersonatingAdmin(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!token) return null;
  const imp = await db.impersonation.findUnique({
    where: { token },
    include: { admin: true },
  });
  if (!imp || imp.endedAt) return null;
  const admin = imp.admin;
  return {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    displayName: admin.displayName,
    role: "admin" as const,
    status: admin.status,
    avatarPath: admin.avatarPath,
    permissions: parsePermissions(admin.permissions),
    storageQuota: Number(admin.storageQuota),
    uploadMaxBytes: Number(admin.uploadMaxBytes),
    uploadEnabled: admin.uploadEnabled,
    downloadEnabled: admin.downloadEnabled,
    approvalRequired: admin.approvalRequired,
  };
}

export async function logAdminActivity(params: {
  adminId: string;
  action: string;
  targetUserId?: string | null;
  targetContent?: string | null;
  metadata?: any;
  ip?: string | null;
}) {
  try {
    await db.adminActivityLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetUserId: params.targetUserId ?? null,
        targetContent: params.targetContent ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : "",
        ip: params.ip ?? null,
      },
    });
  } catch (e) {
    console.error("Failed to log admin activity", e);
  }
}

// Simple in-memory rate limiter (per process). For multi-instance production,
// replace with Redis or similar.
const loginAttempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  let entry = loginAttempts.get(key);
  if (!entry || entry.firstAt + WINDOW_MS < now) {
    entry = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MS;
  }
  loginAttempts.set(key, entry);
}

export function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}

export function detectDevice(userAgent: string | null | undefined): { device: string; browser: string } {
  if (!userAgent) return { device: "Unknown", browser: "Unknown" };
  let browser = "Unknown";
  let device = "Desktop";
  if (/edg/i.test(userAgent)) browser = "Edge";
  else if (/chrome|chromium|crios/i.test(userAgent)) browser = "Chrome";
  else if (/firefox|fxios/i.test(userAgent)) browser = "Firefox";
  else if (/safari/i.test(userAgent)) browser = "Safari";
  if (/android/i.test(userAgent)) device = "Android";
  else if (/iphone|ipad|ipod/i.test(userAgent)) device = "iOS";
  else if (/mobile/i.test(userAgent)) device = "Mobile";
  return { device, browser };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "127.0.0.1";
}
