"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useUIStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize,
  Download,
  Heart,
  Play,
  Pause,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate, formatRelative, toggleFavorite } from "../../shared/use-media-list";
import type { ApiMediaItem } from "@/lib/types";

export function PhotoViewerView() {
  const setView = useUIStore((s) => s.setView);
  const mediaId = useUIStore((s) => s.params.mediaId) as string;
  const [media, setMedia] = useState<ApiMediaItem | null>(null);
  const [siblings, setSiblings] = useState<ApiMediaItem[]>([]);
  const [index, setIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [slideshow, setSlideshow] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const startPanRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    (async () => {
      if (!mediaId) return;
      try {
        const r = await fetch(`/api/media?type=photo&pageSize=200`);
        const d = await r.json();
        const items: ApiMediaItem[] = d.items ?? [];
        setSiblings(items);
        const i = items.findIndex((m) => m.id === mediaId);
        if (i >= 0) {
          setIndex(i);
          setMedia(items[i]);
          setIsFavorite(items[i].isFavorite);
        } else {
          toast.error("Photo not found");
          setView("photos");
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load photo");
      } finally {
        setLoading(false);
      }
    })();
  }, [mediaId, setView]);

  useEffect(() => {
    if (index >= 0 && siblings[index]) {
      setMedia(siblings[index]);
      setIsFavorite(siblings[index].isFavorite);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [index]);

  const next = useCallback(() => {
    if (siblings.length === 0) return;
    setIndex((i) => (i + 1) % siblings.length);
  }, [siblings]);

  const prev = useCallback(() => {
    if (siblings.length === 0) return;
    setIndex((i) => (i - 1 + siblings.length) % siblings.length);
  }, [siblings]);

  // Slideshow
  useEffect(() => {
    if (!slideshow) return;
    const id = setInterval(next, 3000);
    return () => clearInterval(id);
  }, [slideshow, next]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setView("photos");
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
      else if (e.key.toLowerCase() === "f") toggleFullscreen();
      else if (e.key.toLowerCase() === "s") setSlideshow((v) => !v);
      else if (e.key.toLowerCase() === "i") setShowInfo((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, setView]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleFav = async () => {
    try {
      const fav = await toggleFavorite(media!.id);
      setIsFavorite(fav);
    } catch {}
  };

  // Pinch-to-zoom on mobile (basic implementation)
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
    } else if (e.touches.length === 1 && zoom > 1) {
      draggingRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      startPanRef.current = { x: pan.x, y: pan.y };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchRef.current.dist;
      const next = Math.min(5, Math.max(1, pinchRef.current.zoom * ratio));
      setZoom(next);
    } else if (e.touches.length === 1 && draggingRef.current && zoom > 1) {
      const dx = e.touches[0].clientX - draggingRef.current.x;
      const dy = e.touches[0].clientY - draggingRef.current.y;
      setPan({ x: startPanRef.current.x + dx, y: startPanRef.current.y + dy });
    }
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
    draggingRef.current = null;
  };

  // Double-tap zoom
  const lastTapRef = useRef(0);
  const onDoubleClick = () => {
    setZoom((z) => (z > 1 ? 1 : 2.5));
    setPan({ x: 0, y: 0 });
  };
  const onClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleClick();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  if (loading || !media) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col select-none">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 py-3 pt-safe bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setView("photos")}>
          <X className="w-5 h-5" />
        </Button>
        <div className="text-white text-sm font-medium truncate max-w-[60%]">{media.name}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowInfo((v) => !v)}>
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleFav}>
            <Heart className={cn("w-5 h-5", isFavorite && "fill-rose-500 text-rose-500")} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => window.open(`/api/media/${media.id}/download`, "_blank")}>
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
      >
        <img
          src={`/api/media/${media.id}/stream`}
          alt={media.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
          draggable={false}
        />

        {/* Left/right arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
          onClick={(e) => { e.stopPropagation(); prev(); }}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12"
          onClick={(e) => { e.stopPropagation(); next(); }}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>

        {/* Info panel */}
        {showInfo && (
          <div className="absolute top-16 right-3 bg-black/90 backdrop-blur-md text-white p-4 rounded-xl border border-white/10 w-64 z-30 space-y-2 text-xs">
            <div className="font-medium text-sm">{media.name}</div>
            <div className="text-white/60">{formatBytes(media.size)} · {media.mimeType}</div>
            <div className="text-white/60">{formatDate(media.createdAt)} ({formatRelative(media.createdAt)})</div>
            {media.width && media.height && <div className="text-white/60">{media.width}×{media.height}px</div>}
            <div className="text-white/60">Visibility: {media.visibility}</div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 px-3 py-3 pb-safe bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
          <ZoomOut className="w-5 h-5" />
        </Button>
        <div className="text-white text-xs w-16 text-center">{Math.round(zoom * 100)}%</div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(5, z + 0.5))}>
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setRotation((r) => r - 90)}>
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setRotation((r) => r + 90)}>
          <RotateCw className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setSlideshow((v) => !v)}>
          {slideshow ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleFullscreen}>
          <Maximize className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
