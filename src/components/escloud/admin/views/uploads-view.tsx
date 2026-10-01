"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Upload, Users, Lock, Globe, Check, Loader2, FileText, Image as ImageIcon,
  Video as VideoIcon, Users as UsersIcon, X,
} from "lucide-react";
import { useUploadStore } from "@/stores/upload";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function formatBytes(n: number): string {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function detectMediaType(file: File): "video" | "photo" | "document" | "contact" {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type;
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "photo";
  if (mime === "text/vcard" || ext === "vcf") return "contact";
  return "document";
}

const MEDIA_TYPE_ICONS = {
  video: VideoIcon,
  photo: ImageIcon,
  document: FileText,
  contact: UsersIcon,
};

export function AdminUploadsView() {
  const addFiles = useUploadStore((s) => s.addFiles);
  const setShowPanel = useUploadStore((s) => s.setShowPanel);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [targetUserId, setTargetUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch users on mount
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/users");
        const d = await r.json();
        setUsers((d.users ?? []).filter((u: any) => u.role !== "admin"));
      } catch {}
    })();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(filter.toLowerCase()) ||
    u.email?.toLowerCase().includes(filter.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(filter.toLowerCase())
  );

  const toggleUser = (id: string) => {
    setSelectedUserIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setPendingFiles(Array.from(files));
  }, []);

  const startUpload = async () => {
    if (pendingFiles.length === 0) {
      toast.error("Add files to upload first");
      return;
    }
    if (visibility === "private" && selectedUserIds.length === 0 && !targetUserId) {
      toast.error("Select at least one user to assign private content");
      return;
    }
    const opts: any = { visibility };
    if (targetUserId) opts.targetUserId = targetUserId;
    if (visibility === "private") opts.assignUserIds = selectedUserIds;
    await addFiles(pendingFiles, opts);
    toast.success(`Uploading ${pendingFiles.length} file(s)`);
    setPendingFiles([]);
    setShowPanel(true);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-4xl mx-auto space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Upload & Assign</h1>
          <p className="text-xs text-muted-foreground">Upload content and control access — bulk assignment supported</p>
        </div>
      </motion.div>

      {/* Drag & drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Card className={cn("border-2 border-dashed transition-colors", isDragging ? "border-primary bg-primary/5" : "border-border")}>
          <CardContent className="py-10 text-center cursor-pointer" onClick={() => inputRef.current?.click()}>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="w-16 h-16 rounded-full bg-brand-gradient-soft flex items-center justify-center mx-auto mb-4"
            >
              <Upload className="w-8 h-8 text-primary" />
            </motion.div>
            <p className="text-sm font-medium">
              {isDragging ? "Drop files here" : "Drag files here or click to select"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Multiple files supported — types auto-detected (video, photo, document, contact)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending files preview */}
      <AnimatePresence>
        {pendingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Selected Files ({pendingFiles.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingFiles.map((f, i) => {
                  const type = detectMediaType(f);
                  const Icon = MEDIA_TYPE_ICONS[type];
                  return (
                    <motion.div
                      key={`${f.name}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        type === "video" ? "bg-violet-500/15" :
                        type === "photo" ? "bg-amber-500/15" :
                        type === "contact" ? "bg-emerald-500/15" :
                        "bg-sky-500/15"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{f.name}</div>
                        <div className="text-[11px] text-muted-foreground">{formatBytes(f.size)} · {type}</div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-500"
                        onClick={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Access control */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Access Control</CardTitle>
            <CardDescription className="text-xs">Who can access the uploaded content?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                  visibility === "public" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                )}
              >
                <Globe className="w-4 h-4 text-emerald-500" />
                <div className="text-left">
                  <div className="text-sm font-medium">Everyone</div>
                  <div className="text-[11px] text-muted-foreground">Visible to all authorized users</div>
                </div>
                {visibility === "public" && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
              <button
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                  visibility === "private" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/40"
                )}
              >
                <Lock className="w-4 h-4 text-amber-500" />
                <div className="text-left">
                  <div className="text-sm font-medium">Private</div>
                  <div className="text-[11px] text-muted-foreground">Only selected users</div>
                </div>
                {visibility === "private" && <Check className="w-4 h-4 text-primary ml-auto" />}
              </button>
            </div>

            {visibility === "private" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted mb-2">
                  <div className="text-sm font-medium">Selected users: {selectedUserIds.length}</div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedUserIds(users.map((u) => u.id))}>Select all</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds([])}>Clear</Button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Filter users…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-2"
                />
                <div className="max-h-60 overflow-y-auto border rounded-lg scroll-thin">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">No users found</div>
                  ) : filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-accent/40 border-b last:border-0 text-left transition-colors",
                        selectedUserIds.includes(u.id) && "bg-primary/5"
                      )}
                    >
                      <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} onClick={(e) => e.stopPropagation()} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.displayName ?? u.username}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                      {selectedUserIds.includes(u.id) && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <Button
              onClick={startUpload}
              disabled={pendingFiles.length === 0}
              className="w-full bg-brand-gradient text-white hover:opacity-95 shadow-brand btn-press h-11"
            >
              <Upload className="w-4 h-4 mr-2" />
              {pendingFiles.length > 0
                ? `Upload ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}${visibility === "private" ? ` to ${selectedUserIds.length} user(s)` : ""}`
                : "Add files first"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
