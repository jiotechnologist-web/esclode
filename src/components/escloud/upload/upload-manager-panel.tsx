"use client";
import { useUploadStore } from "@/stores/upload";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Upload, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2,
  FileText, Image as ImageIcon, Video as VideoIcon, Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec) return "—";
  return `${formatBytes(bytesPerSec)}/s`;
}

function formatEta(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s`;
}

export function UploadManagerPanel() {
  const { jobs, showPanel, setShowPanel, cancelJob, retryJob, clearCompleted } = useUploadStore();
  const active = jobs.filter((j) => j.status === "uploading" || j.status === "queued").length;
  const totalBytes = jobs.reduce((acc, j) => acc + (j.size || 0), 0);
  const uploadedBytes = jobs.reduce((acc, j) => acc + (j.uploadedBytes || 0), 0);
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;
  const overallProgress = jobs.length > 0 ? jobs.reduce((a, j) => a + (j.progress || 0), 0) / jobs.length : 0;
  const totalSpeed = jobs.filter((j) => j.status === "uploading").reduce((acc, j) => acc + (j.speed || 0), 0);

  return (
    <>
      <AnimatePresence>
        {jobs.length > 0 && !showPanel && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setShowPanel(true)}
            className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-3 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/30 hover:scale-105 transition-all"
          >
            <div className="relative">
              <Upload className="w-4 h-4" />
              {active > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {active}
                </span>
              )}
            </div>
            <span className="text-sm font-medium">{active} active</span>
            <span className="text-xs opacity-90">{(overallProgress * 100).toFixed(0)}%</span>
            <div className="w-1 h-6 bg-white/30 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white" initial={{ height: 0 }} animate={{ height: `${overallProgress * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      <Sheet open={showPanel} onOpenChange={setShowPanel}>
        <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] p-0 rounded-t-3xl border-t-2 border-emerald-500/20">
          <SheetHeader className="px-5 py-4 border-b bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2.5 text-lg">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md">
                  <Upload className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold">Upload Manager</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {active} active · {completedCount} done{failedCount > 0 && ` · ${failedCount} failed`} · {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
                    {totalSpeed > 0 && ` · ${formatSpeed(totalSpeed)}`}
                  </div>
                </div>
              </SheetTitle>
            </div>
            {jobs.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Overall progress</span>
                  <span>{(overallProgress * 100).toFixed(0)}%</span>
                </div>
                <Progress value={overallProgress * 100} className="h-1.5 brand-progress" />
              </div>
            )}
          </SheetHeader>

          <div className="p-4 space-y-2 overflow-y-auto scroll-thin h-[calc(85vh-180px)]">
            <AnimatePresence mode="popLayout">
              {jobs.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Upload className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No active uploads</p>
                  <p className="text-xs text-muted-foreground mt-1">Files you upload will appear here with real-time progress.</p>
                </motion.div>
              )}
              {jobs.map((j) => (
                <motion.div
                  key={j.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 25 }}
                >
                  <Card className="p-3.5 border-border/60 hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex items-start gap-3">
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
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium truncate flex-1">{j.filename}</div>
                          <StatusBadge status={j.status} />
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-1">
                          <span>{formatBytes(j.uploadedBytes)} / {formatBytes(j.size)}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{j.mediaType}</Badge>
                          {j.visibility === "private" && <span className="text-amber-600">· Private</span>}
                        </div>
                        {j.status === "uploading" && j.speed > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{formatSpeed(j.speed)}</span>
                            <span>· ETA {formatEta(j.eta)}</span>
                          </div>
                        )}
                        {j.error && <div className="text-[11px] text-rose-500 truncate mt-1">{j.error}</div>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {j.status === "failed" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => retryJob(j.id)} title="Retry">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {(j.status === "uploading" || j.status === "queued") && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => cancelJob(j.id)} title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {(j.status === "uploading" || j.status === "completed") && (
                      <div className="mt-2">
                        <Progress value={j.progress * 100} className="h-1.5 brand-progress" />
                        <div className="text-[10px] text-muted-foreground mt-1 text-right">
                          {(j.progress * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <SheetFooter className="px-5 py-3 border-t flex items-center justify-between gap-2 bg-background/95 backdrop-blur">
            {(completedCount > 0 || failedCount > 0) && (
              <Button variant="outline" onClick={clearCompleted} size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear finished
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" onClick={() => setShowPanel(false)} size="sm">Hide</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    queued: { label: "Queued", className: "bg-muted text-muted-foreground" },
    uploading: { label: "Uploading", className: "bg-primary/15 text-primary" },
    completed: { label: "Completed", className: "bg-emerald-500/15 text-emerald-600" },
    failed: { label: "Failed", className: "bg-rose-500/15 text-rose-600" },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
  };
  const m = map[status] ?? map.queued;
  return <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", m.className)}>{m.label}</span>;
}

function MediaTypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "video") return <VideoIcon className={className} />;
  if (type === "photo") return <ImageIcon className={className} />;
  if (type === "contact") return <UsersIcon className={className} />;
  return <FileText className={className} />;
}
