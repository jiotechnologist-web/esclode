"use client";
import { useEffect, useState, useCallback } from "react";
import type { ApiMediaItem } from "@/lib/types";

interface FetchOpts {
  type?: string;
  docType?: string;
  visibility?: string;
  search?: string;
  sort?: string;
  favorites?: boolean;
  recent?: boolean;
  ownerId?: string;
  pageSize?: number;
}

export function useMediaList(opts: FetchOpts) {
  const [items, setItems] = useState<ApiMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPage = useCallback(
    async (p: number, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (opts.type) params.set("type", opts.type);
        if (opts.docType) params.set("docType", opts.docType);
        if (opts.visibility) params.set("visibility", opts.visibility);
        if (opts.search) params.set("search", opts.search);
        if (opts.sort) params.set("sort", opts.sort);
        if (opts.favorites) params.set("favorites", "true");
        if (opts.recent) params.set("recent", "true");
        if (opts.ownerId) params.set("ownerId", opts.ownerId);
        params.set("page", String(p));
        params.set("pageSize", String(opts.pageSize ?? 24));
        const r = await fetch(`/api/media?${params.toString()}`);
        if (!r.ok) throw new Error("Failed to load");
        const data = await r.json();
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setHasMore(p * (opts.pageSize ?? 24) < data.total);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [JSON.stringify(opts)]
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  // Real-time sync: when uploads complete or media changes are broadcast,
  // refresh this list automatically (requirement #14)
  useEffect(() => {
    const handler = () => { setPage(1); fetchPage(1, false); };
    window.addEventListener("escloud-data-changed", handler);
    return () => window.removeEventListener("escloud-data-changed", handler);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    await fetchPage(next, true);
  }, [hasMore, loading, page, fetchPage]);

  const refresh = useCallback(() => {
    setPage(1);
    return fetchPage(1, false);
  }, [fetchPage]);

  return { items, loading, error, total, hasMore, loadMore, refresh, page };
}

export async function deleteMedia(id: string): Promise<void> {
  const r = await fetch(`/api/media/${id}`, { method: "DELETE" });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new Error(d.error ?? "Failed to delete");
  }
  // Broadcast for real-time UI sync (requirement #14)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type: "delete", mediaId: id } }));
  }
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const r = await fetch(`/api/media/${id}/favorite`, { method: "POST" });
  if (!r.ok) throw new Error("Failed to favorite");
  const d = await r.json();
  // Broadcast so Favorites view refreshes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type: "favorite", mediaId: id } }));
  }
  return d.isFavorite;
}

export async function saveWatchProgress(id: string, position: number, duration?: number): Promise<void> {
  try {
    await fetch(`/api/media/${id}/watch-progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position, duration }),
    });
  } catch {}
}

export function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const s = Math.floor(seconds % 60);
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelative(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(d);
}
