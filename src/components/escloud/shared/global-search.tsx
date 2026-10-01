"use client";
import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { Input } from "@/components/ui/input";
import { Search, Loader2, FileText, Image as ImageIcon, Video, User, X } from "lucide-react";
import { ApiMediaItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const setView = useUIStore((s) => s.setView);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        setResults(d.items ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [q]);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className="pl-8 pr-7 w-36 sm:w-56 h-9 text-sm"
        />
        {q && (
          <button
            onClick={() => {
              setQ("");
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && q.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-[28rem] max-w-[90vw] max-h-[60vh] overflow-y-auto rounded-xl border bg-popover shadow-xl z-50 scroll-thin"
          >
            {loading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching…
              </div>
            )}
            {!loading && results.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground">No results</div>
            )}
            {!loading &&
              results.map((m) => {
                const Icon = m.type === "video" ? Video : m.type === "photo" ? ImageIcon : m.type === "contact" ? User : FileText;
                const target = m.type === "video" ? "video-player" : m.type === "photo" ? "photo-viewer" : m.type === "contact" ? "contacts" : m.type === "document" ? "documents" : m.type === "video" ? "videos" : "photos";
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setView(target as any, { mediaId: m.id });
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent/60 text-left"
                  >
                    {m.thumbnailUrl ? (
                      <img src={m.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.type}</div>
                    </div>
                  </button>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
