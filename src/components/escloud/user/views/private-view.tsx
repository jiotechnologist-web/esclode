"use client";
import { useState } from "react";
import { useMediaList } from "../../shared/use-media-list";
import { MediaGrid, MediaSkeleton, EmptyState } from "../../shared/media-card";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Search, Shield } from "lucide-react";
import { motion } from "framer-motion";

export function PrivateView() {
  const [search, setSearch] = useState("");
  const { items, loading, refresh } = useMediaList({
    visibility: "private",
    search: search || undefined,
    pageSize: 24,
  });

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Private</h1>
          <p className="text-xs text-muted-foreground">{items.length} private files</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 shadow-premium">
          <CardContent className="py-4 flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
            >
              <Shield className="w-5 h-5 text-amber-500" />
            </motion.div>
            <div>
              <div className="font-medium text-sm">Private Mode</div>
              <div className="text-xs text-muted-foreground">Files assigned to you by administrator only</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search private files…" className="pl-9 h-10 border-border/60" />
      </motion.div>

      {loading ? (
        <MediaSkeleton />
      ) : items.length === 0 ? (
        <EmptyState icon={Shield} title="No private content" description="When your administrator assigns private content to you, it will appear here." />
      ) : (
        <MediaGrid items={items} onChange={refresh} />
      )}
    </div>
  );
}
