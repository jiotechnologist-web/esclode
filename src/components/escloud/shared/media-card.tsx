"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Eye,
  Download,
  Heart,
  MoreVertical,
  Trash2,
  Star,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Users as UsersIcon,
  Lock,
  Clock,
  RotateCw,
} from "lucide-react";
import type { ApiMediaItem } from "@/lib/types";
import { useUIStore } from "@/stores/ui";
import { toggleFavorite, deleteMedia, formatBytes, formatDuration, formatRelative } from "./use-media-list";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  item: ApiMediaItem;
  view?: "grid" | "list";
  onChange?: () => void;
}

export function MediaCard({ item, view = "grid", onChange }: Props) {
  const setView = useUIStore((s) => s.setView);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const [busy, setBusy] = useState(false);

  const open = () => {
    if (item.type === "video") setOverlay("video-player", { mediaId: item.id });
    else if (item.type === "photo") setOverlay("photo-viewer", { mediaId: item.id });
    else if (item.type === "document") setOverlay("photo-viewer", { mediaId: item.id }); // DocumentPreviewOverlay via fallback
    else if (item.type === "contact") setView("contacts", { focus: item.id });
    else setView("documents", { focus: item.id });
  };

  const handleFav = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    try {
      await toggleFavorite(item.id);
      toast.success(item.isFavorite ? "Removed from favorites" : "Added to favorites");
      onChange?.();
    } catch {
      toast.error("Failed");
    }
  };

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteMedia(item.id);
      toast.success("Deleted");
      onChange?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    window.open(`/api/media/${item.id}/download`, "_blank");
  };

  const Icon = item.type === "video" ? VideoIcon : item.type === "photo" ? ImageIcon : item.type === "contact" ? UsersIcon : FileText;

  if (view === "list") {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/40 cursor-pointer border border-transparent hover:border-border"
        onClick={open}
      >
        <div className="relative w-16 h-12 shrink-0 rounded overflow-hidden bg-muted">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{item.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
            <span>{formatBytes(item.size)}</span>
            <span>·</span>
            <span>{formatRelative(item.createdAt)}</span>
            {item.duration && (<><span>·</span><span>{formatDuration(item.duration)}</span></>)}
            {item.visibility === "private" && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-1"><Lock className="w-2.5 h-2.5 mr-0.5" />PRIV</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="icon" variant="ghost" onClick={handleFav} className="h-8 w-8">
            <Heart className={cn("w-4 h-4", item.isFavorite && "fill-rose-500 text-rose-500")} />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDownload} className="h-8 w-8">
            <Download className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={open}><Eye className="w-3.5 h-3.5 mr-2" />Open</DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownload}><Download className="w-3.5 h-3.5 mr-2" />Download</DropdownMenuItem>
              <DropdownMenuItem onClick={handleFav}><Heart className="w-3.5 h-3.5 mr-2" />{item.isFavorite ? "Unfavorite" : "Favorite"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-rose-600" onClick={handleDelete}><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card
        className="group relative overflow-hidden hover:shadow-premium-lg transition-shadow cursor-pointer p-0 shadow-premium card-hover h-full"
        onClick={open}
      >
        <div className="relative aspect-video bg-muted overflow-hidden">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
              <Icon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          {item.type === "video" && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                {formatDuration(item.duration)}
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              {item.watchProgress && item.duration && (
                <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40">
                  <div className="h-full brand-progress" style={{ width: `${Math.min(100, (item.watchProgress / item.duration) * 100)}%` }} />
                </div>
              )}
            </>
          )}
          {item.visibility === "private" && (
            <Badge className="absolute top-2 left-2 text-[10px] bg-black/70 backdrop-blur hover:bg-black/70 text-white border-0">
              <Lock className="w-2.5 h-2.5 mr-1" />PRIVATE
            </Badge>
          )}
          {item.status === "pending" && (
            <Badge className="absolute top-2 right-2 text-[10px] bg-amber-500/90 hover:bg-amber-500/90 text-white">
              <Clock className="w-2.5 h-2.5 mr-0.5" />PENDING
            </Badge>
          )}
          {item.status === "processing" && (
            <Badge className="absolute top-2 right-2 text-[10px] bg-blue-500/90 hover:bg-blue-500/90 text-white">
              <RotateCw className="w-2.5 h-2.5 mr-0.5 animate-spin" />PROCESSING
            </Badge>
          )}
        </div>
        <div className="p-3">
          <div className="font-medium text-sm truncate">{item.name}</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
            <span>{formatBytes(item.size)}</span>
            <span>·</span>
            <span>{formatRelative(item.createdAt)}</span>
          </div>
        </div>
        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
          <Button
            size="icon"
            variant="secondary"
          className="h-7 w-7 bg-black/60 hover:bg-black/80 text-white border-0"
          onClick={handleFav}
        >
          <Heart className={cn("w-3.5 h-3.5", item.isFavorite && "fill-rose-500 text-rose-500")} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 bg-black/60 hover:bg-black/80 text-white border-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={open}><Eye className="w-3.5 h-3.5 mr-2" />Open</DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}><Download className="w-3.5 h-3.5 mr-2" />Download</DropdownMenuItem>
            <DropdownMenuItem onClick={handleFav}><Heart className="w-3.5 h-3.5 mr-2" />{item.isFavorite ? "Unfavorite" : "Favorite"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600" onClick={handleDelete}><Trash2 className="w-3.5 h-3.5 mr-2" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </Card>
    </motion.div>
  );
}

export function MediaGrid({ items, view = "grid", onChange }: { items: ApiMediaItem[]; view?: "grid" | "list"; onChange?: () => void }) {
  if (view === "list") {
    return (
      <div className="space-y-1">
        {items.map((m) => (
          <MediaCard key={m.id} item={m} view="list" onChange={onChange} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {items.map((m) => (
        <MediaCard key={m.id} item={m} onChange={onChange} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = FileText, title, description, action }: { icon?: any; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function MediaSkeleton({ count = 12, view = "grid" }: { count?: number; view?: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-16 h-12 rounded bg-muted animate-pulse" />
            <div className="flex-1">
              <div className="h-3.5 w-1/3 rounded bg-muted animate-pulse mb-1.5" />
              <div className="h-3 w-1/4 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border">
          <div className="aspect-video bg-muted animate-pulse" />
          <div className="p-3">
            <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse mb-2" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ViewToggle({ view, onChange }: { view: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return (
    <div className="flex items-center rounded-lg border overflow-hidden">
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        className="rounded-none h-8"
        onClick={() => onChange("grid")}
      >
        <Star className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        className="rounded-none h-8"
        onClick={() => onChange("list")}
      >
        <FileText className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
