"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Download, Loader2, FileText, Maximize, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import type { ApiMediaItem } from "@/lib/types";

interface Props {
  item: ApiMediaItem;
  onClose: () => void;
}

export function DocumentPreviewOverlay({ item, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  // PDFs can be previewed via iframe (browser-native PDF viewer)
  const isPdf = item.mimeType === "application/pdf" || item.docType === "pdf";
  // Images can be previewed directly (for documents that are images)
  const isImage = item.mimeType.startsWith("image/");
  // Text files can be previewed via fetch + render
  const isText = item.mimeType.startsWith("text/") || item.docType === "txt" || item.docType === "csv";

  const canPreview = isPdf || isImage || isText;

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      toast.error("Fullscreen not supported");
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 select-none flex flex-col">
      {/* Top bar */}
      <div className="p-3 pt-safe bg-black/90 backdrop-blur-md text-white flex items-center justify-between gap-2 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
        <div className="text-sm font-medium truncate flex-1">{item.name}</div>
        <Button variant="ghost" size="icon" onClick={() => window.open(`/api/media/${item.id}/download`, "_blank")} className="text-white hover:bg-white/10">
          <Download className="w-5 h-5" />
        </Button>
        {canPreview && (
          <>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="text-white hover:bg-white/10">
              <ZoomOut className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="text-white hover:bg-white/10">
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
              <Maximize className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto scroll-thin bg-neutral-900 flex items-center justify-center" style={{ zoom }}>
        {loading && canPreview && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
        {!canPreview ? (
          <div className="text-white text-center p-6 max-w-md">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-white/60" />
            </div>
            <h3 className="text-lg font-semibold">Preview not available</h3>
            <p className="text-sm text-white/60 mt-2">
              This file type ({item.mimeType || item.docType}) cannot be previewed in the browser.
              Please download it to view.
            </p>
            <Button
              className="mt-4 bg-brand-gradient text-white"
              onClick={() => window.open(`/api/media/${item.id}/download`, "_blank")}
            >
              <Download className="w-4 h-4 mr-2" /> Download File
            </Button>
          </div>
        ) : isPdf ? (
          <iframe
            src={`/api/media/${item.id}/stream#toolbar=0&view=FitH`}
            className="w-full h-full border-0 bg-white"
            title={item.name}
            onLoad={() => setLoading(false)}
          />
        ) : isImage ? (
          <img
            src={`/api/media/${item.id}/stream`}
            alt={item.name}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setLoading(false)}
          />
        ) : isText ? (
          <TextPreview url={`/api/media/${item.id}/stream`} onLoad={() => setLoading(false)} />
        ) : null}
      </div>
    </div>
  );
}

function TextPreview({ url, onLoad }: { url: string; onLoad: () => void }) {
  const [content, setContent] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(url);
        const text = await r.text();
        setContent(text);
        onLoad();
      } catch {
        setError(true);
        onLoad();
      }
    })();
  }, [url]);

  if (error) return <div className="text-white/60 p-4">Failed to load text content.</div>;
  return (
    <pre className="text-white/90 p-4 text-sm font-mono whitespace-pre-wrap break-words max-w-full">
      {content || "Loading..."}
    </pre>
  );
}
