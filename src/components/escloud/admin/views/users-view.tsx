"use client";
import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, UserPlus, Loader2, Lock, ShieldCheck, Upload as UploadIcon, Eye, MoreHorizontal,
  CheckCircle2, QrCode,
} from "lucide-react";
import type { ApiUserListItem } from "@/lib/types";
import { formatBytes, formatRelative } from "../../shared/use-media-list";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DEFAULT_USER_PERMISSIONS, PERMISSIONS, serializePermissions, ADMIN_TOGGLEABLE_PERMISSIONS } from "@/lib/permissions";

export function AdminUsersView() {
  const setView = useUIStore((s) => s.setView);
  const [users, setUsers] = useState<ApiUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const d = await r.json();
      setUsers(d.users ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [search, statusFilter]);

  const toggleSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const bulkAction = async (action: string) => {
    if (selected.length === 0) return;
    const confirmMsgs: Record<string, string> = {
      grant_private_access: `Grant Private Access to ${selected.length} user(s)? They will be able to upload private content and view private content shared with them.`,
      revoke_private_access: `Revoke Private Access from ${selected.length} user(s)? They will lose access to private content.`,
      grant_upload: `Grant upload permission to ${selected.length} user(s)?`,
      revoke_upload: `Revoke upload permission from ${selected.length} user(s)?`,
      activate: `Activate ${selected.length} user(s)?`,
      suspend: `Suspend ${selected.length} user(s)?`,
      delete: `Delete ${selected.length} user(s)? This is irreversible.`,
      force_logout: `Force logout all sessions for ${selected.length} user(s)?`,
    };
    if (!confirm(confirmMsgs[action] ?? `Apply "${action}" to ${selected.length} user(s)?`)) return;
    setBusy(true);
    try {
      if (action === "delete") {
        for (const id of selected) {
          try { await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); } catch {}
        }
      } else if (action === "force_logout") {
        for (const id of selected) {
          try { await fetch(`/api/admin/users/${id}/force-logout`, { method: "POST" }); } catch {}
        }
      } else {
        const r = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: selected, action }),
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.error ?? "Failed");
        }
      }
      toast.success(`Bulk action completed`);
      setSelected([]);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground">{users.length} users · {selected.length} selected</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-brand-gradient text-white">
          <UserPlus className="w-4 h-4 mr-1.5" /> Create User
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, name…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions toolbar */}
      {selected.length > 0 && (
        <div className="space-y-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <div className="flex-1" />
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => bulkAction("grant_all")} disabled={busy}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Grant All Permissions
            </Button>
            <Button size="sm" variant="destructive" onClick={() => bulkAction("delete")} disabled={busy}>
              Delete
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-emerald-500/20">
            <Button size="sm" variant="outline" onClick={() => bulkAction("grant_private_access")} disabled={busy}>
              <Lock className="w-3.5 h-3.5 mr-1" /> Grant Private
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("revoke_private_access")} disabled={busy}>
              <Lock className="w-3.5 h-3.5 mr-1" /> Revoke Private
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("grant_upload")} disabled={busy}>
              <UploadIcon className="w-3.5 h-3.5 mr-1" /> Allow Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("revoke_upload")} disabled={busy}>
              <UploadIcon className="w-3.5 h-3.5 mr-1" /> Block Upload
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("grant_qr_scan")} disabled={busy}>
              <QrCode className="w-3.5 h-3.5 mr-1" /> Allow QR Scan
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("revoke_qr_scan")} disabled={busy}>
              <QrCode className="w-3.5 h-3.5 mr-1" /> Block QR Scan
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("activate")} disabled={busy}>Activate</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("suspend")} disabled={busy}>Suspend</Button>
            <Button size="sm" variant="outline" onClick={() => bulkAction("force_logout")} disabled={busy}>Force logout</Button>
            <Button size="sm" variant="ghost" onClick={() => bulkAction("revoke_all")} disabled={busy}>
              Revoke All
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => (
            <UserCard key={u.id} user={u} selected={selected.includes(u.id)} onToggle={() => toggleSelect(u.id)} onOpen={() => setView("user-detail", { userId: u.id })} />
          ))}
        </div>
      )}

      <CreateUserDialog open={showCreate} onOpenChange={setShowCreate} onCreated={refresh} />
    </div>
  );
}

function UserCard({ user, selected, onToggle, onOpen }: { user: ApiUserListItem; selected: boolean; onToggle: () => void; onOpen: () => void }) {
  return (
    <Card className={`p-3 cursor-pointer hover:shadow-md transition-all ${selected ? "ring-2 ring-emerald-500" : ""}`} onClick={onOpen}>
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            selected ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/40"
          }`}
        >
          {selected && (
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          )}
        </button>
        <Avatar className="w-11 h-11 shrink-0">
          <AvatarFallback className="bg-brand-gradient text-white text-sm">
            {user.displayName?.[0]?.toUpperCase() ?? user.username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="font-medium text-sm truncate">{user.displayName ?? user.username}</div>
            {user.role === "admin" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
          <div className="flex flex-wrap items-center gap-1 mt-1.5">
            <StatusBadge status={user.status} />
            {user.hasPrivateAccess && (
              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                <Lock className="w-2.5 h-2.5 mr-0.5" />Private
              </Badge>
            )}
            {user.canUpload && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <UploadIcon className="w-2.5 h-2.5 mr-0.5" />Upload
              </Badge>
            )}
          </div>
        </div>
        <MoreHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{formatBytes(user.usedStorage)} / {formatBytes(user.storageQuota)}</span>
        <span>{user.lastActiveAt ? formatRelative(user.lastActiveAt) : "—"}</span>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: any; label: string }> = {
    active: { variant: "default", label: "Active" },
    suspended: { variant: "secondary", label: "Suspended" },
    deleted: { variant: "destructive", label: "Deleted" },
  };
  const m = map[status] ?? map.active;
  return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
}

function CreateUserDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [storageQuota, setStorageQuota] = useState(20 * 1024 * 1024 * 1024);
  const [uploadMaxBytes, setUploadMaxBytes] = useState(5 * 1024 * 1024 * 1024);
  const [grantPrivateAccess, setGrantPrivateAccess] = useState(false);
  const [perms, setPerms] = useState<string[]>(DEFAULT_USER_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const finalPerms = grantPrivateAccess ? [...perms, PERMISSIONS.PRIVATE_ACCESS, PERMISSIONS.VIEW_PRIVATE] : perms;
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, email, password, displayName, role,
          storageQuota, uploadMaxBytes,
          permissions: role === "admin" ? [...DEFAULT_USER_PERMISSIONS, "admin"] : finalPerms,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`Created ${username}`);
      onOpenChange(false);
      setUsername(""); setEmail(""); setPassword(""); setDisplayName("");
      onCreated();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Provision a new user account</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Username *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Password *</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Storage quota (bytes)</Label>
              <Input type="number" value={storageQuota} onChange={(e) => setStorageQuota(Number(e.target.value))} />
            </div>
          </div>
          {role === "user" && (
            <>
              <div className="flex items-center justify-between p-2.5 rounded-lg border bg-amber-500/5">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <div>
                    <div className="text-sm font-medium">Grant Private Access</div>
                    <div className="text-[11px] text-muted-foreground">Allow this user to upload private content and view private content shared with them</div>
                  </div>
                </div>
                <Switch checked={grantPrivateAccess} onCheckedChange={setGrantPrivateAccess} />
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Advanced permissions</summary>
                <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto p-2 rounded-lg border mt-2">
                  {ADMIN_TOGGLEABLE_PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={perms.includes(p.key)}
                        onChange={(e) => setPerms((s) => e.target.checked ? [...s, p.key] : s.filter((x) => x !== p.key))}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </details>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !username || !email || !password}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <UserPlus className="w-4 h-4 mr-1" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
