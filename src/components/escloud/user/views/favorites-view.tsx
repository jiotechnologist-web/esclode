"use client";
import { useMediaList } from "../../shared/use-media-list";
import { MediaGrid, MediaSkeleton, EmptyState, ViewToggle } from "../../shared/media-card";
import { Heart } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function FavoritesView() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const { items, loading, refresh } = useMediaList({ favorites: true, pageSize: 36 });

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Favorites</h1>
            <p className="text-xs text-muted-foreground">{items.length} favorites</p>
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </motion.div>

      {loading ? (
        <MediaSkeleton view={view} />
      ) : items.length === 0 ? (
        <EmptyState icon={Heart} title="No favorites yet" description="Tap the heart on any media to add it to favorites." />
      ) : (
        <MediaGrid items={items} view={view} onChange={refresh} />
      )}
    </div>
  );
}
