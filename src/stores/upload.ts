"use client";
import { create } from "zustand";

export interface UploadJob {
  id: string;
  uploadId?: string;
  file: File;
  mediaType: "video" | "photo" | "document" | "contact";
  filename: string;
  size: number;
  mimeType: string;
  status: "queued" | "uploading" | "completed" | "failed" | "cancelled" | "paused";
  progress: number; // 0..1
  receivedChunks: number;
  totalChunks: number;
  uploadedBytes: number; // bytes uploaded so far
  speed: number; // bytes per second
  eta: number | null; // seconds remaining
  error: string | null;
  startedAt: number;
  finishedAt: number | null;
  visibility: "public" | "private";
  targetUserId?: string;
  assignUserIds?: string[];
  mediaId?: string;
}

interface UploadState {
  jobs: UploadJob[];
  maxConcurrent: number;
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
  addFiles: (
    files: File[],
    opts: { visibility?: "public" | "private"; targetUserId?: string; assignUserIds?: string[] }
  ) => Promise<void>;
  cancelJob: (id: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  retryJob: (id: string) => Promise<void>;
  clearCompleted: () => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024;

function detectMediaType(file: File): "video" | "photo" | "document" | "contact" {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type;
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "photo";
  if (mime === "text/vcard" || mime === "text/x-vcard" || ext === "vcf") return "contact";
  return "document";
}

async function startJob(job: UploadJob): Promise<void> {
  const setJob = (patch: Partial<UploadJob>) => {
    useUploadStore.setState((s) => ({
      jobs: s.jobs.map((j) => (j.id === job.id ? { ...j, ...patch } : j)),
    }));
  };
  try {
    setJob({ status: "uploading", startedAt: Date.now(), progress: 0, uploadedBytes: 0, speed: 0, eta: null });
    const initResp = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: job.file.name,
        size: job.file.size,
        mimeType: job.file.type || "application/octet-stream",
        visibility: job.visibility,
        targetUserId: job.targetUserId,
        assignUserIds: job.assignUserIds,
      }),
    });
    if (!initResp.ok) {
      const err = await initResp.json().catch(() => ({}));
      throw new Error(err.error ?? "init failed");
    }
    const initData = await initResp.json();
    const uploadId = initData.uploadId as string;
    const chunkSize = initData.chunkSize ?? CHUNK_SIZE;
    setJob({ uploadId, totalChunks: initData.totalChunks });

    const concurrency = Math.min(3, initData.totalChunks);
    let idx = 0;
    let lastProgressTime = Date.now();
    let lastUploaded = 0;
    const worker = async () => {
      while (idx < initData.totalChunks) {
        const chunkIdx = idx++;
        if (chunkIdx >= initData.totalChunks) return;
        const start = chunkIdx * chunkSize;
        const end = Math.min(start + chunkSize, job.file.size);
        const blob = job.file.slice(start, end);
        const form = new FormData();
        form.append("uploadId", uploadId);
        form.append("index", String(chunkIdx));
        form.append("chunk", blob);
        let attempt = 0;
        let ok = false;
        while (attempt < 3 && !ok) {
          try {
            const r = await fetch("/api/upload/chunk", { method: "POST", body: form });
            if (!r.ok) throw new Error("chunk failed");
            ok = true;
            const data = await r.json();
            const uploadedBytes = data.receivedChunks * chunkSize;
            const now = Date.now();
            const elapsed = (now - lastProgressTime) / 1000;
            const speed = elapsed > 0 ? (uploadedBytes - lastUploaded) / elapsed : 0;
            const remaining = job.size - uploadedBytes;
            const eta = speed > 0 ? remaining / speed : null;
            setJob({
              receivedChunks: data.receivedChunks,
              progress: data.receivedChunks / initData.totalChunks,
              uploadedBytes,
              speed,
              eta,
            });
            lastProgressTime = now;
            lastUploaded = uploadedBytes;
          } catch {
            attempt++;
            await new Promise((r) => setTimeout(r, 800 * attempt));
          }
        }
        if (!ok) throw new Error(`Chunk ${chunkIdx} failed after retries`);
      }
    };
    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    const compResp = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId,
        visibility: job.visibility,
        assignUserIds: job.assignUserIds,
      }),
    });
    if (!compResp.ok) {
      const err = await compResp.json().catch(() => ({}));
      throw new Error(err.error ?? "complete failed");
    }
    const compData = await compResp.json();
    setJob({
      status: "completed",
      progress: 1,
      uploadedBytes: job.size,
      finishedAt: Date.now(),
      mediaId: compData.mediaId,
      speed: 0,
      eta: 0,
    });
    // Broadcast for real-time UI sync (requirement #14)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type: "upload", mediaId: compData.mediaId } }));
    }
  } catch (e: any) {
    setJob({ status: "failed", error: e?.message ?? "Upload failed", finishedAt: Date.now() });
  }
}

export const useUploadStore = create<UploadState>((set, get) => ({
  jobs: [],
  maxConcurrent: 3,
  showPanel: false,
  setShowPanel: (v) => set({ showPanel: v }),
  addFiles: async (files, opts) => {
    const visibility = opts.visibility ?? "public";
    const newJobs: UploadJob[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      mediaType: detectMediaType(f),
      filename: f.name,
      size: f.size,
      mimeType: f.type || "application/octet-stream",
      status: "queued",
      progress: 0,
      receivedChunks: 0,
      totalChunks: 0,
      uploadedBytes: 0,
      speed: 0,
      eta: null,
      error: null,
      startedAt: 0,
      finishedAt: null,
      visibility,
      targetUserId: opts.targetUserId,
      assignUserIds: opts.assignUserIds,
    }));
    set((s) => ({ jobs: [...s.jobs, ...newJobs], showPanel: true }));
    const queue = [...newJobs];
    const max = get().maxConcurrent;
    const workers = Array.from({ length: Math.min(max, queue.length) }, async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) break;
        await startJob(job);
      }
    });
    await Promise.all(workers);
  },
  cancelJob: async (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (job?.uploadId) {
      try {
        await fetch("/api/upload/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId: job.uploadId }),
        });
      } catch {}
    }
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: "cancelled", finishedAt: Date.now() } : j)),
    }));
  },
  cancelAll: async () => {
    const jobs = get().jobs;
    for (const j of jobs) {
      if (j.status === "uploading" || j.status === "queued") {
        await get().cancelJob(j.id);
      }
    }
  },
  retryJob: async (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: "queued", progress: 0, receivedChunks: 0, uploadedBytes: 0, speed: 0, eta: null, error: null, startedAt: 0, finishedAt: null, uploadId: undefined } : j)) }));
    await startJob({ ...job, status: "queued", progress: 0, receivedChunks: 0, uploadedBytes: 0, speed: 0, eta: null, error: null, startedAt: 0, finishedAt: null, uploadId: undefined });
  },
  clearCompleted: () => {
    set((s) => ({ jobs: s.jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled") }));
  },
}));
