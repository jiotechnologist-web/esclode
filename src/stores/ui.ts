"use client";
import { create } from "zustand";

export type UserView =
  | "home"
  | "videos"
  | "video-player"
  | "photos"
  | "photo-viewer"
  | "private"
  | "documents"
  | "contacts"
  | "uploads"
  | "favorites"
  | "recent"
  | "profile"
  | "settings";

export type AdminView =
  | "dashboard"
  | "users"
  | "user-detail"
  | "media"
  | "media-viewer"
  | "uploads"
  | "logs"
  | "settings"
  | "admin-profile";

export type LoginView = "user-login" | "admin-login" | "qr-login";

type AnyView = UserView | AdminView | LoginView | "loading";

interface HistoryEntry {
  view: AnyView;
  params: Record<string, any>;
  overlay?: "media-viewer" | "video-player" | "photo-viewer" | null;
}

interface UIState {
  view: AnyView;
  params: Record<string, any>;
  overlay: "media-viewer" | "video-player" | "photo-viewer" | null;
  setView: (v: AnyView, params?: Record<string, any>) => void;
  setOverlay: (o: UIState["overlay"], params?: Record<string, any>) => void;
  closeOverlay: () => void;
  goBack: () => void;
  canGoBack: boolean;
  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
  applyTheme: () => void;
  // Mobile nav
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  // User nav prefs (cached)
  navPrefs: {
    primaryItems: string[];
    hiddenItems: string[];
  } | null;
  setNavPrefs: (p: UIState["navPrefs"]) => void;
  // Video settings (cached)
  videoPrefs: {
    preloadVideos: boolean;
    advancedVideoPlay: boolean;
    preferredQuality: string;
    autoQuality: boolean;
    preBufferLevel: string;
    dataSaver: boolean;
    reelsEnabled: boolean;
    videoRotation: number;
  } | null;
  setVideoPrefs: (p: UIState["videoPrefs"]) => void;
}

const THEME_KEY = "escloud-theme";

export const useUIStore = create<UIState>((set, get) => ({
  view: "loading",
  params: {},
  overlay: null,
  setView: (v, params = {}) => {
    const state = get();
    // Don't push duplicates onto the stack
    if (state.view === v && state.overlay === null && JSON.stringify(state.params) === JSON.stringify(params)) {
      return;
    }
    // Push current state onto history
    historyPush({ view: state.view, params: state.params, overlay: state.overlay });
    set({ view: v, params, overlay: null });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  },
  setOverlay: (o, params = {}) => {
    const state = get();
    if (state.overlay === o) return;
    // Push the current view (without overlay) so Back closes the overlay first
    historyPush({ view: state.view, params: state.params, overlay: state.overlay });
    set({ overlay: o, params: { ...state.params, ...params } });
  },
  closeOverlay: () => {
    set({ overlay: null });
  },
  goBack: () => {
    const entry = historyPop();
    if (entry) {
      set({ view: entry.view, params: entry.params, overlay: entry.overlay ?? null });
    } else {
      // Fallback: just close any overlay
      if (get().overlay) {
        set({ overlay: null });
      }
    }
  },
  canGoBack: false,
  theme: "system",
  setTheme: (t) => {
    set({ theme: t });
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, t);
      get().applyTheme();
    }
  },
  applyTheme: () => {
    if (typeof window === "undefined") return;
    const t = get().theme;
    const root = document.documentElement;
    const isDark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  },
  mobileOpen: false,
  setMobileOpen: (v) => set({ mobileOpen: v }),
  navPrefs: null,
  setNavPrefs: (p) => set({ navPrefs: p }),
  videoPrefs: null,
  setVideoPrefs: (p) => set({ videoPrefs: p }),
}));

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(THEME_KEY) as any;
  useUIStore.getState().setTheme(stored ?? "system");
}

// --- History management ---
const HISTORY_KEY = "escloud-history-stack";

function getStack(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStack(stack: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    // Cap at 50 entries to avoid memory bloat
    if (stack.length > 50) stack = stack.slice(-50);
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(stack));
    // Update canGoBack flag
    useUIStore.setState({ canGoBack: stack.length > 0 });
  } catch {}
}

function historyPush(entry: HistoryEntry) {
  const stack = getStack();
  stack.push(entry);
  saveStack(stack);
  // Also push to browser history so physical back button works
  if (typeof window !== "undefined") {
    try {
      window.history.pushState({ escloud: true, t: Date.now() }, "");
    } catch {}
  }
}

function historyPop(): HistoryEntry | null {
  const stack = getStack();
  const entry = stack.pop() ?? null;
  saveStack(stack);
  return entry;
}

// Hook the browser back button so it triggers our internal navigation
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const entry = historyPop();
    if (entry) {
      useUIStore.setState({ view: entry.view, params: entry.params, overlay: entry.overlay ?? null });
    } else if (useUIStore.getState().overlay) {
      useUIStore.setState({ overlay: null });
    }
  });
}
