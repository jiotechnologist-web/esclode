"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useUIStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Maximize,
  Download, Info, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ApiMediaItem } from "@/lib/types";

interface Props {
  items: ApiMediaItem[];
  startIndex: number;
  onClose: () => void;
}

export function PhotoViewerOverlay({ items, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  const media = items[index];
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const startPanRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const lastTapRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  // Reset on index change
  useEffect(() => {
    setLoading(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  }, [index]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(5, z + 0.5));
      else if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
      else if (e.key.toLowerCase() === "r") setRotation((r) => (r + 90) % 360);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  // Mouse drag (when zoomed)
  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      dragRef.current = { x: e.clientX, y: e.clientY };
      startPanRef.current = { x: pan.x, y: pan.y };
    }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current && zoom > 1) {
      setPan({
        x: startPanRef.current.x + (e.clientX - dragRef.current.x),
        y: startPanRef.current.y + (e.clientY - dragRef.current.y),
      });
    }
  };
  const onMouseUp = () => { dragRef.current = null; };

  // Touch: pinch-to-zoom + double-tap-zoom + swipe-down to close
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoom };
    } else if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
      if (zoom > 1) {
        dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startPanRef.current = { x: pan.x, y: pan.y };
      }
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchRef.current.dist;
      setZoom(Math.min(5, Math.max(1, pinchRef.current.zoom * ratio)));
    } else if (e.touches.length === 1 && dragRef.current && zoom > 1) {
      setPan({
        x: startPanRef.current.x + (e.touches[0].clientX - dragRef.current.x),
        y: startPanRef.current.y + (e.touches[0].clientY - dragRef.current.y),
      });
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    pinchRef.current = null;
    dragRef.current = null;
    if (touchStartYRef.current !== null && zoom === 1 && e.changedTouches[0]) {
      const dy = e.changedTouches[0].clientY - touchStartYRef.current;
      if (dy > 100) onClose(); // swipe down to close
    }
    touchStartYRef.current = null;
  };

  const onDoubleClick = () => {
    setZoom((z) => (z > 1 ? 1 : 2.5));
    setPan({ x: 0, y: 0 });
  };

  const onClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) onDoubleClick();
    else lastTapRef.current = now;
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error("Fullscreen not supported");
    }
  };

  if (!media) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center text-white">
        <p>Photo not found</p>
        <Button variant="outline" onClick={onClose} className="ml-3 text-white">Close</Button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 select-none overflow-hidden"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 p-4 pt-safe bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
        <div className="text-white text-sm font-medium truncate max-w-[60vw]">{media.name}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowInfo(!showInfo)} className="text-white hover:bg-white/10">
            <Info className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.open(`/api/media/${media.id}/download`, "_blank")} className="text-white hover:bg-white/10">
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Image */}
      <div className="absolute inset-0 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
        <img
          src={`/api/media/${media.id}/stream`}
          alt={media.name}
          className="max-w-full max-h-full object-contain transition-transform duration-150"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
            transformOrigin: "center",
            willChange: "transform",
            cursor: zoom > 1 ? "grab" : "default",
          }}
          draggable={false}
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* Left/right arrows */}
      {items.length > 1 && (
        <>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10">
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 z-10">
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}

      {/* Info panel */}
      {showInfo && (
        <div className="absolute top-16 right-3 z-30 bg-black/90 backdrop-blur-md text-white p-4 rounded-2xl border border-white/10 w-64 text-xs space-y-2">
          <div className="flex justify-between"><span className="text-white/50">Name</span><span className="text-white/90 truncate ml-2">{media.name}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Size</span><span className="text-white/90">{formatBytes(media.size)}</span></div>
          <div className="flex justify-between"><span className="text-white/50">Type</span><span className="text-white/90">{media.mimeType}</span></div>
          {media.width && media.height && <div className="flex justify-between"><span className="text-white/50">Dimensions</span><span className="text-white/90">{media.width}×{media.height}</span></div>}
          <div className="flex justify-between"><span className="text-white/50">Visibility</span><span className="text-white/90 capitalize">{media.visibility}</span></div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 z-20 p-4 pb-safe bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }} className="text-white hover:bg-white/10">
          <ZoomOut className="w-5 h-5" />
        </Button>
        <div className="text-white text-xs w-16 text-center">{Math.round(zoom * 100)}%</div>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(5, z + 0.5)); }} className="text-white hover:bg-white/10">
          <ZoomIn className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setRotation((r) => (r - 90 + 360) % 360); }} className="text-white hover:bg-white/10">
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setRotation((r) => (r + 90) % 360); }} className="text-white hover:bg-white/10">
          <RotateCw className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:bg-white/10">
          <Maximize className="w-5 h-5" />
        </Button>
      </div>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}
