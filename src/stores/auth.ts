"use client";
import { create } from "zustand";
import type { AuthUser } from "@/lib/auth";

interface AuthState {
  user: AuthUser | null;
  isImpersonating: boolean;
  impersonatingAdmin: { id: string; username: string; email: string; displayName: string | null } | null;
  loading: boolean;
  /** Fetch the latest session from the server. Use this to refresh permissions after admin changes. */
  fetchSession: () => Promise<void>;
  /** Same as fetchSession but silent (does not flip loading state). Used for auto-refresh. */
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isImpersonating: false,
  impersonatingAdmin: null,
  loading: true,
  fetchSession: async () => {
    set({ loading: true });
    try {
      const r = await fetch("/api/auth/login");
      const data = await r.json();
      if (data && data.user) {
        const u = data.user;
        set({
          user: {
            id: u.id,
            username: u.username,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            status: u.status,
            avatarPath: u.avatarPath ?? null,
            permissions: u.permissions ?? [],
            storageQuota: u.storageQuota ?? 0,
            uploadMaxBytes: u.uploadMaxBytes ?? 0,
            uploadEnabled: u.uploadEnabled ?? false,
            downloadEnabled: u.downloadEnabled ?? false,
            approvalRequired: u.approvalRequired ?? false,
          },
          isImpersonating: !!data.isImpersonating,
          impersonatingAdmin: data.impersonatingAdmin ?? null,
          loading: false,
        });
      } else {
        set({ user: null, isImpersonating: false, impersonatingAdmin: null, loading: false });
      }
    } catch {
      set({ user: null, loading: false });
    }
  },
  refreshSession: async () => {
    // Silent refresh — does not flip loading state, only updates if user is logged in
    if (!get().user) return;
    try {
      const r = await fetch("/api/auth/login");
      const data = await r.json();
      if (data && data.user) {
        const u = data.user;
        set({
          user: {
            id: u.id,
            username: u.username,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            status: u.status,
            avatarPath: u.avatarPath ?? null,
            permissions: u.permissions ?? [],
            storageQuota: u.storageQuota ?? 0,
            uploadMaxBytes: u.uploadMaxBytes ?? 0,
            uploadEnabled: u.uploadEnabled ?? false,
            downloadEnabled: u.downloadEnabled ?? false,
            approvalRequired: u.approvalRequired ?? false,
          },
          isImpersonating: !!data.isImpersonating,
          impersonatingAdmin: data.impersonatingAdmin ?? null,
        });
      } else {
        // Session ended (admin force-logout)
        set({ user: null, isImpersonating: false, impersonatingAdmin: null });
      }
    } catch {
      // Network error — keep current state
    }
  },
  logout: async () => {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    set({ user: null, isImpersonating: false, impersonatingAdmin: null });
  },
  setUser: (u) => set({ user: u }),
}));

// Set up global auto-refresh:
// 1. On window focus (user returns to the tab — likely admin changed permissions)
// 2. Every 30 seconds (catches permission changes made while tab is open)
// 3. On storage event (multi-tab sync — if another tab logs out, this tab follows)
if (typeof window !== "undefined") {
  let refreshTimer: any = null;
  const startAutoRefresh = () => {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      useAuthStore.getState().refreshSession();
    }, 30_000);
  };
  startAutoRefresh();

  window.addEventListener("focus", () => {
    useAuthStore.getState().refreshSession();
  });
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      useAuthStore.getState().refreshSession();
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === "escloud-logout-event") {
      useAuthStore.getState().fetchSession();
    }
  });
}
