"use client";
import { useUploadStore } from "@/stores/upload";
import { EmptyState } from "../../shared/media-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2,
  FileText, Image as ImageIcon, Video as VideoIcon, Users as UsersIcon,
} from "lucide-react";
import { formatBytes } from "../../shared/use-media-list";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function UploadsView() {
  const { jobs, cancelAll, retryJob, clearCompleted } = useUploadStore();
  const active = jobs.filter((j) => j.status === "uploading" || j.status === "queued");
  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const cancelled = jobs.filter((j) => j.status === "cancelled");

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-5xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Upload Manager</h1>
            <p className="text-xs text-muted-foreground">
              {active.length} active · {completed.length} done · {failed.length} failed · {cancelled.length} cancelled
            </p>
          </div>
        </div>
        {active.length > 0 && (
          <Button variant="outline" size="sm" onClick={cancelAll} className="btn-press">
            <X className="w-3.5 h-3.5 mr-1.5" /> Cancel all
          </Button>
        )}
      </motion.div>

      {jobs.length === 0 ? (
        <EmptyState icon={Upload} title="No uploads yet" description="Files you upload will appear here with real-time progress." />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {jobs.map((j) => (
              <motion.div
                key={j.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 25 }}
              >
                <Card className="p-3.5 hover:shadow-premium transition-shadow shadow-premium">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      j.status === "completed" ? "bg-emerald-500/15" :
                      j.status === "failed" ? "bg-rose-500/15" :
                      j.status === "cancelled" ? "bg-muted" :
                      "bg-primary/10"
                    )}>
                      {j.status === "completed" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : j.status === "failed" ? (
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      ) : j.status === "cancelled" ? (
                        <X className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <MediaTypeIcon type={j.mediaType} className={cn("w-5 h-5", j.status === "uploading" ? "text-primary" : "text-muted-foreground")} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{j.filename}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>{formatBytes(j.size)}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{j.mediaType}</Badge>
                        {j.status === "uploading" && <span>· {j.receivedChunks}/{j.totalChunks} chunks</span>}
                        {j.visibility === "private" && <span className="text-amber-600">· Private</span>}
                      </div>
                      {j.error && <div className="text-[11px] text-rose-500 truncate mt-1">{j.error}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {j.status === "failed" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => retryJob(j.id)}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {(j.status === "uploading" || j.status === "queued") && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => useUploadStore.getState().cancelJob(j.id)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(j.status === "uploading" || j.status === "completed") && (
                    <Progress value={j.progress * 100} className="h-1 mt-3 brand-progress" />
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {(completed.length > 0 || failed.length > 0) && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={clearCompleted} className="btn-press">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear completed
          </Button>
        </div>
      )}
    </div>
  );
}

function MediaTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "video") return <VideoIcon className={className} />;
  if (type === "photo") return <ImageIcon className={className} />;
  if (type === "contact") return <UsersIcon className={className} />;
  return <FileText className={className} />;
}
