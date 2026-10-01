"use client";
import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { VideoPlayerOverlay } from "./video-player-overlay";
import { PhotoViewerOverlay } from "./photo-viewer-overlay";
import { DocumentPreviewOverlay } from "./document-preview-overlay";
import type { ApiMediaItem } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function MediaViewerOverlay() {
  const overlay = useUIStore((s) => s.overlay);
  const params = useUIStore((s) => s.params);
  const goBack = useUIStore((s) => s.goBack);
  const videoPrefs = useUIStore((s) => s.videoPrefs);
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<ApiMediaItem[]>([]);
  const [index, setIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [singleItem, setSingleItem] = useState<ApiMediaItem | null>(null);

  useEffect(() => {
    if (!overlay) return;
    const mediaId = params.mediaId as string;
    if (!mediaId) {
      goBack();
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Determine type filter for swipe context
        const typeFilter = overlay === "video-player" ? "video" : overlay === "photo-viewer" ? "photo" : undefined;
        const listUrl = typeFilter
          ? `/api/media?type=${typeFilter}&pageSize=200`
          : `/api/media?pageSize=200`;
        const r = await fetch(listUrl);
        const d = await r.json();
        if (cancelled) return;
        const list: ApiMediaItem[] = d.items ?? [];
        const i = list.findIndex((m) => m.id === mediaId);
        if (i >= 0) {
          setItems(list);
          setIndex(i);
          setSingleItem(null);
        } else {
          // Fallback: fetch single item
          try {
            const singleR = await fetch(`/api/media/${mediaId}`);
            if (singleR.ok) {
              const singleD = await singleR.json();
              if (cancelled) return;
              if (singleD.item) {
                setSingleItem(singleD.item);
                setItems([singleD.item]);
                setIndex(0);
              } else {
                setSingleItem(null);
                setItems([]);
                setIndex(-1);
              }
            } else {
              setItems([]);
              setIndex(-1);
            }
          } catch {
            setItems([]);
            setIndex(-1);
          }
        }
      } catch {
        setItems([]);
        setIndex(-1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [overlay, params.mediaId]);

  if (!overlay) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  if (items.length === 0 || index < 0) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center text-white p-6">
        <p className="text-sm">Media not found or you don't have access.</p>
        <button onClick={goBack} className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20">Close</button>
      </div>
    );
  }

  const item = items[index];

  // Route to specialized viewer based on type
  if (overlay === "video-player" && item.type === "video") {
    const reelsMode = videoPrefs?.reelsEnabled ?? false;
    return <VideoPlayerOverlay items={items} startIndex={index} reelsMode={reelsMode} onClose={goBack} />;
  }

  if (overlay === "photo-viewer" && item.type === "photo") {
    return <PhotoViewerOverlay items={items} startIndex={index} onClose={goBack} />;
  }

  // For documents, use the document preview overlay
  if (item.type === "document") {
    return <DocumentPreviewOverlay item={item} onClose={goBack} />;
  }

  // Fallback: photo viewer
  return <PhotoViewerOverlay items={items} startIndex={index} onClose={goBack} />;
}
