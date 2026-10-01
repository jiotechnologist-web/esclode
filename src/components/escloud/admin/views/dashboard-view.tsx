"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Video, Image as ImageIcon, FileText, HardDrive, Lock, ScrollText, TrendingUp, TrendingDown, Download, Upload, AlertCircle, Activity, Clock } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import type { ApiAdminStats } from "@/lib/types";
import { formatBytes } from "../../shared/use-media-list";

export function AdminDashboardView() {
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/stats");
        const d = await r.json();
        setStats(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-7xl mx-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, sub: `${stats.activeUsers} active · ${stats.suspendedUsers} suspended`, icon: Users, color: "from-emerald-500 to-teal-500" },
    { label: "Videos", value: stats.totalVideos, icon: Video, color: "from-violet-500 to-fuchsia-500" },
    { label: "Photos", value: stats.totalPhotos, icon: ImageIcon, color: "from-amber-500 to-orange-500" },
    { label: "Documents", value: stats.totalDocuments, icon: FileText, color: "from-sky-500 to-blue-500" },
    { label: "Contacts", value: stats.totalContacts, icon: Users, color: "from-rose-500 to-pink-500" },
    { label: "Private Files", value: stats.privateFiles, icon: Lock, color: "from-slate-600 to-slate-800" },
    { label: "Pending Uploads", value: stats.pendingUploads, icon: AlertCircle, color: "from-yellow-500 to-orange-500" },
    { label: "Activity Logged", value: stats.totalUploads + stats.totalDownloads, sub: `${stats.totalUploads} up · ${stats.totalDownloads} down`, icon: Activity, color: "from-cyan-500 to-blue-500" },
  ];

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Real-time overview of the Escloud platform</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden p-0">
            <div className={`h-1 bg-gradient-to-r ${c.color}`} />
            <CardContent className="pt-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center shrink-0`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none">{c.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{c.label}</div>
                {c.sub && <div className="text-[10px] text-muted-foreground truncate">{c.sub}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Storage usage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Storage</CardTitle>
          </div>
          <CardDescription className="text-xs">{formatBytes(stats.storageUsed)} used · {formatBytes(stats.storageRemaining)} remaining across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={stats.storageUsed / Math.max(1, stats.storageUsed + stats.storageRemaining) * 100} className="h-2 brand-progress" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {stats.storageByType.map((s) => (
              <div key={s.type} className="p-3 rounded-lg bg-muted text-center">
                <div className="text-2xl font-bold">{s.count}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.type}s</div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatBytes(s.bytes)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Uploads/Downloads charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              <CardTitle className="text-base">Uploads (last 14 days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.uploadsByDay}>
                <defs>
                  <linearGradient id="uploadsG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="1" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#uploadsG)" name="Uploads" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-500" />
              <CardTitle className="text-base">Downloads (last 14 days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.downloadsByDay}>
                <defs>
                  <linearGradient id="downloadsG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="1" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} fill="url(#downloadsG)" name="Downloads" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Storage breakdown pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats.storageByType}
                  dataKey="bytes"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  label={(entry) => `${entry.type}: ${formatBytes(entry.bytes as number)}`}
                >
                  {stats.storageByType.map((_, i) => (
                    <Cell key={i} fill={["#10b981", "#f59e0b", "#0ea5e9", "#ef4444"][i % 4]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatBytes(Number(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
