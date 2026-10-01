"use client";
import { useMediaList } from "../../shared/use-media-list";
import { MediaGrid, MediaSkeleton, EmptyState } from "../../shared/media-card";
import { History } from "lucide-react";
import { motion } from "framer-motion";

export function RecentView() {
  const { items, loading } = useMediaList({ recent: true, pageSize: 24 });

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md">
          <History className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Recent</h1>
          <p className="text-xs text-muted-foreground">Recently viewed videos</p>
        </div>
      </motion.div>

      {loading ? (
        <MediaSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="No recent activity" description="Videos you watch will show up here so you can resume from where you left off." />
      ) : (
        <MediaGrid items={items} />
      )}
    </div>
  );
}
