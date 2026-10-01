"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Video, Image as ImageIcon, FileText, Users, ChevronRight, Cloud, Lock, Settings as SettingsIcon,
} from "lucide-react";
import type { ApiMediaItem } from "@/lib/types";
import { MediaGrid } from "../../shared/media-card";
import { formatBytes } from "../../shared/use-media-list";
import { useUploadStore } from "@/stores/upload";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { UploadButton } from "../../shared/upload-button";

export function HomeView() {
  const user = useAuthStore((s) => s.user)!;
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const setView = useUIStore((s) => s.setView);
  const setOverlay = useUIStore((s) => s.setOverlay);
  const addFiles = useUploadStore((s) => s.addFiles);
  const [profile, setProfile] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<ApiMediaItem[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<ApiMediaItem[]>([]);

  useEffect(() => {
    refreshSession();
    (async () => {
      try {
        const [p, v, ph] = await Promise.all([
          fetch("/api/profile").then((r) => r.json()),
          fetch("/api/media?type=video&pageSize=8").then((r) => r.json()),
          fetch("/api/media?type=photo&pageSize=8").then((r) => r.json()),
        ]);
        setProfile(p);
        setRecentVideos(v.items ?? []);
        setRecentPhotos(ph.items ?? []);
      } catch {}
    })();
  }, []);

  const storagePct = profile ? Math.min(100, (profile.storage.used / profile.storage.quota) * 100) : 0;
  const hasPrivateAccess = hasPermission(user.permissions, PERMISSIONS.PRIVATE_ACCESS);
  const canUploadAny = user.uploadEnabled && (
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_VIDEOS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_PHOTOS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_DOCUMENTS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_CONTACTS)
  );

  const stats = [
    { label: "Videos", value: profile?.storage.byType.find((b: any) => b.type === "video")?.count ?? 0, icon: Video, color: "from-violet-500 to-fuchsia-500", view: "videos" as const, delay: 0 },
    { label: "Photos", value: profile?.storage.byType.find((b: any) => b.type === "photo")?.count ?? 0, icon: ImageIcon, color: "from-amber-500 to-orange-500", view: "photos" as const, delay: 0.05 },
    { label: "Documents", value: profile?.storage.byType.find((b: any) => b.type === "document")?.count ?? 0, icon: FileText, color: "from-sky-500 to-blue-500", view: "documents" as const, delay: 0.1 },
    { label: "Contacts", value: profile?.storage.byType.find((b: any) => b.type === "contact")?.count ?? 0, icon: Users, color: "from-emerald-500 to-teal-500", view: "contacts" as const, delay: 0.15 },
  ];

  const openMedia = (m: ApiMediaItem) => {
    if (m.type === "video") setOverlay("video-player", { mediaId: m.id });
    else if (m.type === "photo") setOverlay("photo-viewer", { mediaId: m.id });
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Welcome, {user.displayName ?? user.username} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Your private cloud at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setView("settings")} className="btn-press">
            <SettingsIcon className="w-4 h-4 mr-2" /> Settings
          </Button>
          {canUploadAny && (
            <UploadButton
              label="Upload Files"
              className="bg-brand-gradient text-white hover:opacity-95 shadow-brand btn-press"
              onFiles={async (files) => {
                await addFiles(files, { visibility: "public" });
                toast.success(`Uploading ${files.length} file(s)`);
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Storage card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="overflow-hidden p-0 shadow-premium">
          <div className="bg-brand-gradient-soft">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand">
                    <Cloud className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">Storage</div>
                    <div className="text-xs text-muted-foreground">{profile?.storage.mediaCount ?? 0} items in your cloud</div>
                  </div>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {formatBytes(profile?.storage.used ?? 0)} / {formatBytes(profile?.storage.quota ?? 0)}
                </Badge>
              </div>
              <Progress value={storagePct} className="h-2 brand-progress" />
              <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                <span>{storagePct.toFixed(1)}% used</span>
                <span>{formatBytes(Math.max(0, (profile?.storage.quota ?? 0) - (profile?.storage.used ?? 0)))} remaining</span>
              </div>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: s.delay + 0.15, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => setView(s.view)}
            className="cursor-pointer"
          >
            <Card className="overflow-hidden p-0 shadow-premium card-hover">
              <div className={`h-1 bg-gradient-to-r ${s.color}`} />
              <CardContent className="flex items-center gap-3 pt-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Private Access banner */}
      {hasPrivateAccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/30 shadow-premium">
            <CardContent className="py-4 flex items-center gap-3">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <Lock className="w-5 h-5 text-emerald-500" />
              </motion.div>
              <div className="flex-1">
                <div className="font-medium text-sm">Private Access enabled</div>
                <div className="text-xs text-muted-foreground">You can upload and view private content shared with you.</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setView("private")} className="btn-press">
                Open Private
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Videos */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Recent Videos</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("videos")}>
            View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {recentVideos.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
            No videos yet. Upload one to get started.
          </div>
        ) : (
          <MediaGrid items={recentVideos.slice(0, 5)} onChange={() => setView("home")} />
        )}
      </motion.section>

      {/* Recent Photos */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Recent Photos</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView("photos")}>
            View all <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {recentPhotos.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-xl">
            No photos yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {recentPhotos.slice(0, 6).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.04 }}
                className="aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity group relative shadow-premium"
                onClick={() => openMedia(p)}
              >
                {p.thumbnailUrl && <img src={p.thumbnailUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                {p.visibility === "private" && (
                  <div className="absolute top-1 right-1">
                    <Lock className="w-3 h-3 text-white drop-shadow" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
