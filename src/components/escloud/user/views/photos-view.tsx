"use client";
import { useEffect, useState } from "react";
import { useMediaList } from "../../shared/use-media-list";
import { MediaSkeleton, EmptyState, ViewToggle } from "../../shared/media-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Image as ImageIcon, Loader2 } from "lucide-react";
import { useUploadStore } from "@/stores/upload";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { toast } from "sonner";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { UploadButton } from "../../shared/upload-button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function PhotosView() {
  const user = useAuthStore((s) => s.user)!;
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const addFiles = useUploadStore((s) => s.addFiles);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const canUpload = user.uploadEnabled && hasPermission(user.permissions, PERMISSIONS.UPLOAD_PHOTOS);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const [view, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");

  const { items, loading, hasMore, loadMore } = useMediaList({
    type: "photo",
    search: search || undefined,
    sort,
    pageSize: 36,
  });

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center gap-3 justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Photos</h1>
            <p className="text-xs text-muted-foreground">{items.length} photos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setViewMode} />
          {canUpload && (
            <UploadButton
              label="Upload"
              size="sm"
              accept="image/*"
              className="bg-brand-gradient text-white hover:opacity-95 shadow-brand btn-press"
              onFiles={async (files) => {
                await addFiles(files, { visibility: "public" });
                toast.success(`Uploading ${files.length} file(s)`);
              }}
            />
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search photos…" className="pl-9 h-10 border-border/60" />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44 h-10 border-border/60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="name:asc">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No photos yet" description="Upload photos to build your gallery." />
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className={cn("aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:shadow-premium-lg transition-shadow group relative shadow-premium")}
              onClick={() => setOverlay("photo-viewer", { mediaId: p.id })}
            >
              {p.thumbnailUrl && (
                <img src={p.thumbnailUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors opacity-0 group-hover:opacity-100 flex items-end p-2">
                <div className="text-white text-[10px] truncate">{p.name}</div>
              </div>
              {p.visibility === "private" && (
                <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">PRIV</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button onClick={loadMore} variant="outline" className="btn-press"><Loader2 className="w-4 h-4 mr-2" /> Load more</Button>
        </div>
      )}
    </div>
  );
}
