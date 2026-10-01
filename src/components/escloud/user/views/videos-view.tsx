"use client";
import { useEffect, useState } from "react";
import { useMediaList } from "../../shared/use-media-list";
import { MediaGrid, MediaSkeleton, EmptyState, ViewToggle } from "../../shared/media-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Video as VideoIcon, Loader2 } from "lucide-react";
import { useUploadStore } from "@/stores/upload";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { UploadButton } from "../../shared/upload-button";
import { motion } from "framer-motion";

export function VideosView() {
  const user = useAuthStore((s) => s.user)!;
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const addFiles = useUploadStore((s) => s.addFiles);
  const canUpload = user.uploadEnabled && hasPermission(user.permissions, PERMISSIONS.UPLOAD_VIDEOS);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");

  const { items, loading, hasMore, loadMore, refresh } = useMediaList({
    type: "video",
    search: search || undefined,
    sort,
    pageSize: 24,
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
            <VideoIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Videos</h1>
            <p className="text-xs text-muted-foreground">{items.length} videos in your library</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canUpload && (
            <UploadButton
              label="Upload"
              size="sm"
              accept="video/*"
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            className="pl-9 h-10 border-border/60"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-44 h-10 border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">Newest first</SelectItem>
            <SelectItem value="createdAt:asc">Oldest first</SelectItem>
            <SelectItem value="name:asc">Name A-Z</SelectItem>
            <SelectItem value="name:desc">Name Z-A</SelectItem>
            <SelectItem value="duration:desc">Longest</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {loading ? (
        <MediaSkeleton view={view} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={VideoIcon}
          title="No videos yet"
          description={search ? "Try different search terms" : "Upload your first video to start building your library."}
        />
      ) : (
        <>
          <MediaGrid items={items} view={view} onChange={refresh} />
          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={loadMore} variant="outline" className="btn-press">
                <Loader2 className="w-4 h-4 mr-2" /> Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
