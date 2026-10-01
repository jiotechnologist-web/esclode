"use client";
import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Lock,
  LogOut,
  Trash2,
  Eye,
  Upload as UploadIcon,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes, formatDate, formatRelative } from "../../shared/use-media-list";
import { DEFAULT_USER_PERMISSIONS, PERMISSIONS, ADMIN_TOGGLEABLE_PERMISSIONS } from "@/lib/permissions";
import { UploadButton } from "../../shared/upload-button";
import type { ApiMediaItem } from "@/lib/types";
import { useUploadStore } from "@/stores/upload";

export function AdminUserDetailView() {
  const setView = useUIStore((s) => s.setView);
  const userId = useUIStore((s) => s.params.userId) as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [permState, setPermState] = useState<string[]>([]);
  const [form, setForm] = useState<any>({});
  const [userContent, setUserContent] = useState<ApiMediaItem[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const addFiles = useUploadStore((s) => s.addFiles);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/users/${userId}`).then((r) => r.json()),
        fetch(`/api/admin/users/${userId}/content`).then((r) => r.json()),
      ]);
      setData(r1);
      setForm(r1.user);
      setPermState(r1.user.permissions);
      setUserContent(r2.items ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  if (loading) return <div className="p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <div className="p-6 text-rose-500">User not found</div>;

  const saveUser = async () => {
    try {
      const body = {
        username: form.username,
        email: form.email,
        displayName: form.displayName,
        phone: form.phone,
        status: form.status,
        storageQuota: form.storageQuota,
        uploadMaxBytes: form.uploadMaxBytes,
        uploadEnabled: form.uploadEnabled,
        downloadEnabled: form.downloadEnabled,
        approvalRequired: form.approvalRequired,
        permissions: permState,
      };
      const r = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("User updated");
      setEditing(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
    }
  };

  const impersonate = async () => {
    if (!confirm(`Switch to ${data.user.username}'s account? You will see their dashboard exactly as they do.`)) return;
    try {
      const r = await fetch(`/api/admin/users/${userId}/impersonate`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Switching to user view…");
      useAuthStore.getState().fetchSession();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const forceLogout = async () => {
    if (!confirm("Force logout all sessions of this user?")) return;
    try {
      await fetch(`/api/admin/users/${userId}/force-logout`, { method: "POST" });
      toast.success("Sessions revoked");
      refresh();
    } catch {}
  };

  const resetPassword = async () => {
    const newPwd = prompt("Enter new password for this user (min 6 chars):");
    if (!newPwd) return;
    if (newPwd.length < 6) return toast.error("Password too short");
    try {
      const r = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPwd, mustChange: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Password reset; user will be asked to change on next login");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Permanently delete ${data.user.username}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      toast.success("User deleted");
      setView("users");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    await addFiles(Array.from(files), { visibility: "public", targetUserId: userId });
    toast.success(`Uploading ${files.length} file(s) to ${data.user.username}`);
    setTimeout(refresh, 1000);
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setView("users")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold flex-1">User Details</h1>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-center md:items-start gap-4">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-brand-gradient text-white text-2xl">
              {data.user.displayName?.[0]?.toUpperCase() ?? data.user.username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold">{data.user.displayName ?? data.user.username}</h2>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1 justify-center md:justify-start">
              <Badge variant={data.user.status === "active" ? "default" : "secondary"}>{data.user.status}</Badge>
              <Badge variant="outline">{data.user.role}</Badge>
              <Badge variant="outline">{data.user.mediaCount ?? 0} files</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-end">
            <Button size="sm" variant="outline" onClick={impersonate}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Switch to User
            </Button>
            <Button size="sm" variant="outline" onClick={forceLogout}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Force Logout
            </Button>
            <Button size="sm" variant="outline" onClick={resetPassword}>
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Reset Password
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteUser}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="content">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        {/* Content tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">User Content</CardTitle>
                  <CardDescription className="text-xs">{userContent.length} files · {formatBytes(data.storage.used)} used</CardDescription>
                </div>
                <UploadButton
                  label="Upload to User"
                  size="sm"
                  className="bg-brand-gradient text-white hover:opacity-95 shadow-brand btn-press"
                  onFiles={async (files) => {
                    await addFiles(files, { visibility: "public", targetUserId: userId });
                    toast.success(`Uploading ${files.length} file(s) to ${data.user.username}`);
                    setTimeout(refresh, 1000);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent>
              {userContent.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No content yet</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {userContent.map((m) => (
                    <div key={m.id} className="rounded-lg overflow-hidden border bg-card">
                      {m.thumbnailUrl ? (
                        <div className="aspect-video bg-muted">
                          <img src={m.thumbnailUrl} alt={m.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground">
                          {m.type === "video" ? "Video" : m.type === "photo" ? "Photo" : m.type === "contact" ? "VCF" : m.docType?.toUpperCase()}
                        </div>
                      )}
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">{m.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>{formatBytes(m.size)}</span>
                          {m.visibility === "private" && <Badge variant="secondary" className="text-[9px] px-1 py-0">PRIV</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base">Permissions</CardTitle>
                  <CardDescription className="text-xs">Toggle individual capabilities for this user</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPermState(ADMIN_TOGGLEABLE_PERMISSIONS.map((p) => p.key));
                      setEditing(true);
                    }}
                  >
                    Grant All
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // Revoke all toggleable permissions (keep system defaults like view_videos etc that aren't in the toggleable list)
                      const toggleable = new Set(ADMIN_TOGGLEABLE_PERMISSIONS.map((p) => p.key));
                      setPermState(permState.filter((p) => !toggleable.has(p)));
                      setEditing(true);
                    }}
                  >
                    Revoke All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group permissions by category for clearer UI */}
              {Object.entries(
                ADMIN_TOGGLEABLE_PERMISSIONS.reduce((acc, p) => {
                  if (!acc[p.group]) acc[p.group] = [];
                  acc[p.group].push(p);
                  return acc;
                }, {} as Record<string, typeof ADMIN_TOGGLEABLE_PERMISSIONS>)
              ).map(([group, perms]) => (
                <div key={group} className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <div key={p.key} className="flex items-center justify-between p-2 rounded-lg border">
                        <span className="text-sm">{p.label}</span>
                        <Switch
                          checked={permState.includes(p.key)}
                          onCheckedChange={(checked) => {
                            setPermState((s) => checked ? [...s, p.key] : s.filter((x) => x !== p.key));
                            setEditing(true);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {editing && (
                <Button onClick={saveUser} className="mt-3 bg-brand-gradient text-white">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Limits tab */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storage & Limits</CardTitle>
              <CardDescription className="text-xs">Configure quotas and bandwidth limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Storage quota (bytes)</Label>
                  <Input
                    type="number"
                    value={form.storageQuota}
                    onChange={(e) => { setForm({ ...form, storageQuota: Number(e.target.value) }); setEditing(true); }}
                  />
                  <p className="text-[11px] text-muted-foreground">Used: {formatBytes(data.storage.used)}</p>
                </div>
                <div className="space-y-1">
                  <Label>Max upload file size (bytes)</Label>
                  <Input
                    type="number"
                    value={form.uploadMaxBytes}
                    onChange={(e) => { setForm({ ...form, uploadMaxBytes: Number(e.target.value) }); setEditing(true); }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <ToggleRow label="Upload enabled" checked={form.uploadEnabled} onChange={(v) => { setForm({ ...form, uploadEnabled: v }); setEditing(true); }} />
                <ToggleRow label="Download enabled" checked={form.downloadEnabled} onChange={(v) => { setForm({ ...form, downloadEnabled: v }); setEditing(true); }} />
                <ToggleRow label="Approval required" checked={form.approvalRequired} onChange={(v) => { setForm({ ...form, approvalRequired: v }); setEditing(true); }} />
              </div>
              {editing && (
                <Button onClick={saveUser} className="bg-brand-gradient text-white">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Active Sessions</CardTitle>
                <Button size="sm" variant="outline" onClick={forceLogout}>
                  <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.sessions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No active sessions</div>
              ) : (
                <div className="space-y-2">
                  {data.sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{s.device ?? "Unknown"} · {s.browser ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">IP: {s.ip ?? "—"} · Last active: {formatRelative(s.lastActive)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg border">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

import { useAuthStore } from "@/stores/auth";
