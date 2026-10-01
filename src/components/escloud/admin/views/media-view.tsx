"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, Trash2, Download, Lock, Globe, Filter, Eye, Loader2, FileText, Play, Preview as PreviewIcon,
} from "lucide-react";
import { useMediaList, formatBytes, formatRelative, deleteMedia } from "../../shared/use-media-list";
import { useUIStore } from "@/stores/ui";
import { toast } from "sonner";
import type { ApiMediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function AdminMediaView() {
  const [type, setType] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const setOverlay = useUIStore((s) => s.setOverlay);

  const { items, loading, refresh, hasMore, loadMore } = useMediaList({
    type: type && type !== "all" ? type : undefined,
    visibility: visibility && visibility !== "all" ? visibility : undefined,
    search: search || undefined,
    pageSize: 50,
  });

  const allSelected = selected.length > 0 && selected.length === items.length && items.length > 0;

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(items.map((m) => m.id));
    }
  };

  const bulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} media file(s)? This is irreversible.`)) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try {
        await deleteMedia(id);
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Deleted ${ok}${fail ? `, ${fail} failed` : ""}`);
    setSelected([]);
    setBusy(false);
  };

  const bulkChangeVisibility = async (vis: "public" | "private") => {
    if (selected.length === 0) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of selected) {
      try {
        const r = await fetch(`/api/media/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: vis }),
        });
        if (!r.ok) throw new Error("Failed");
        ok++;
      } catch {
        fail++;
      }
    }
    toast.success(`Updated ${ok}${fail ? `, ${fail} failed` : ""}`);
    setSelected([]);
    setBusy(false);
    refresh();
  };

  const openMedia = (m: ApiMediaItem) => {
    if (m.type === "video") setOverlay("video-player", { mediaId: m.id });
    else if (m.type === "photo") setOverlay("photo-viewer", { mediaId: m.id });
    else if (m.type === "document") setOverlay("photo-viewer", { mediaId: m.id }); // DocumentPreviewOverlay will be used based on type
    else window.open(`/api/media/${m.id}/download`, "_blank");
  };

  const downloadMedia = (m: ApiMediaItem) => {
    window.open(`/api/media/${m.id}/download`, "_blank");
  };

  const deleteOne = async (m: ApiMediaItem) => {
    if (!confirm(`Delete "${m.name}"?`)) return;
    try {
      await deleteMedia(m.id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold">Media Management</h1>
        <p className="text-sm text-muted-foreground">All media across all users · click any item to preview</p>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media…" className="pl-9 h-10 border-border/60" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-36 h-10 border-border/60"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="photo">Photos</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="sm:w-36 h-10 border-border/60"><SelectValue placeholder="Visibility" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visibility</SelectItem>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Bulk actions toolbar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{selected.length} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => bulkChangeVisibility("public")} disabled={busy}>
                <Globe className="w-3.5 h-3.5 mr-1" /> Make Public
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkChangeVisibility("private")} disabled={busy}>
                <Lock className="w-3.5 h-3.5 mr-1" /> Make Private
              </Button>
              <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={busy}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Deselect All</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No media found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting filters or upload new content.</p>
        </div>
      ) : (
        <>
          {/* Select All bar */}
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              {allSelected ? "Deselect All" : "Select All"} ({items.length})
            </button>
          </div>

          {/* Grid of media cards with selection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
                whileHover={{ y: -4 }}
                className={cn(
                  "relative group rounded-xl overflow-hidden border cursor-pointer shadow-premium card-hover transition-all",
                  selected.includes(m.id) && "ring-2 ring-emerald-500"
                )}
                onClick={() => openMedia(m)}
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {m.thumbnailUrl ? (
                    <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
                      <span className="text-2xl uppercase text-muted-foreground font-bold">
                        {m.docType ?? m.type.slice(0, 4)}
                      </span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-1.5 left-1.5 flex gap-1">
                    {m.visibility === "private" ? (
                      <Badge className="text-[10px] bg-black/70 backdrop-blur hover:bg-black/70 text-white border-0">
                        <Lock className="w-2.5 h-2.5 mr-0.5" />PRIVATE
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] bg-black/70 backdrop-blur hover:bg-black/70 text-white border-0">
                        <Globe className="w-2.5 h-2.5 mr-0.5" />PUBLIC
                      </Badge>
                    )}
                  </div>
                  {m.type === "video" && m.duration && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                      {Math.floor(m.duration / 60)}:{String(Math.floor(m.duration % 60)).padStart(2, "0")}
                    </div>
                  )}
                  {/* Selection checkbox (always clickable, including private) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }}
                    className={cn(
                      "absolute top-1.5 right-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                      selected.includes(m.id)
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-white/70 bg-black/40 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {selected.includes(m.id) && (
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                  </button>
                  {/* Hover preview overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      {m.type === "video" ? <Play className="w-6 h-6 text-white fill-white" /> : <Eye className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm truncate">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1">
                    {m.ownerName && <><span>{m.ownerName}</span><span>·</span></>}
                    <span>{formatBytes(m.size)}</span>
                    <span>·</span>
                    <span>{formatRelative(m.createdAt)}</span>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); openMedia(m); }}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); downloadMedia(m); }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-500"
                      onClick={(e) => { e.stopPropagation(); deleteOne(m); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} className="btn-press"><Loader2 className="w-4 h-4 mr-2" /> Load more</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
