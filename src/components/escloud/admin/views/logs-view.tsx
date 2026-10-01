"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, Trash2, Loader2 } from "lucide-react";
import { formatRelative } from "../../shared/use-media-list";

interface LogItem {
  id: string;
  adminName: string;
  adminEmail: string;
  targetUserName: string | null;
  action: string;
  targetContent: string | null;
  metadata: any;
  ip: string | null;
  createdAt: string;
}

export function AdminLogsView() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/logs?limit=500&search=${encodeURIComponent(search)}`);
      const d = await r.json();
      setLogs(d.logs ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [search]);

  const clearOld = async () => {
    const days = prompt("Clear logs older than how many days?", "30");
    if (!days) return;
    try {
      const r = await fetch(`/api/admin/logs?days=${days}`, { method: "DELETE" });
      const d = await r.json();
      toast.success(`Cleared ${d.deleted} logs`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const actionColor = (action: string): string => {
    if (action.startsWith("user.delete")) return "text-rose-500";
    if (action.startsWith("user.suspend")) return "text-amber-500";
    if (action.startsWith("admin.login")) return "text-emerald-500";
    if (action.startsWith("user.create")) return "text-emerald-500";
    if (action.startsWith("user.impersonate")) return "text-cyan-500";
    if (action.startsWith("settings")) return "text-sky-500";
    return "text-muted-foreground";
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="w-5 h-5 text-primary" /> Activity Log</h1>
          <p className="text-sm text-muted-foreground">{logs.length} entries</p>
        </div>
        <Button variant="outline" onClick={clearOld}><Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear old</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by action…" className="pl-9" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {logs.map((l) => (
              <div key={l.id} className="p-3 flex items-start gap-3 hover:bg-accent/30">
                <div className={`mt-1 w-2 h-2 rounded-full ${actionColor(l.action).replace("text-", "bg-")}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className={actionColor(l.action)}>{l.action}</span>
                    {l.targetUserName && <span className="text-muted-foreground"> → {l.targetUserName}</span>}
                    {l.targetContent && <span className="text-muted-foreground"> [{l.targetContent}]</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {l.adminName} ({l.adminEmail}) · {formatRelative(l.createdAt)}
                    {l.ip && ` · ${l.ip}`}
                    {l.metadata && Object.keys(l.metadata).length > 0 && (
                      <span> · {JSON.stringify(l.metadata).slice(0, 100)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

import { toast } from "sonner";
