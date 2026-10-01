"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserCircle, Lock, LogOut, Save, Camera, Shield, HardDrive, Check,
  Settings as SettingsIcon, Upload as UploadIcon, Video, Image as ImageIcon, FileText, Users as UsersIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "../../shared/use-media-list";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { useUIStore } from "@/stores/ui";
import { motion } from "framer-motion";

export function ProfileView() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const setView = useUIStore((s) => s.setView);

  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/profile");
      const d = await r.json();
      setProfile(d);
      setDisplayName(d.profile.displayName ?? "");
      setPhone(d.profile.phone ?? "");
      setEmail(d.profile.email ?? "");
      setUsername(d.profile.username ?? "");
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, phone, email, username }),
      });
      if (!r.ok) throw new Error("Failed");
      toast.success("Profile updated");
      setEditing(false);
      fetchSession();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const changePwd = async () => {
    if (!currentPwd || !newPwd) return;
    if (newPwd.length < 6) { toast.error("New password too short"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPwd, next: newPwd }),
      });
      if (!r.ok) throw new Error("Failed");
      toast.success("Password changed");
      setCurrentPwd("");
      setNewPwd("");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      if (!r.ok) throw new Error("Failed");
      toast.success("Avatar updated");
      load();
      fetchSession();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const storagePct = profile ? Math.min(100, (profile.storage.used / profile.storage.quota) * 100) : 0;
  const hasPrivateAccess = hasPermission(user.permissions, PERMISSIONS.PRIVATE_ACCESS);
  const canUpload = user.uploadEnabled && (
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_VIDEOS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_PHOTOS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_DOCUMENTS) ||
    hasPermission(user.permissions, PERMISSIONS.UPLOAD_CONTACTS)
  );

  const permLabels: Record<string, string> = {
    view_videos: "View Videos", view_photos: "View Photos", view_private: "View Private",
    view_documents: "View Documents", view_contacts: "View Contacts", view_favorites: "View Favorites",
    view_recent: "View Recent", view_uploads: "View Uploads",
    upload_videos: "Upload Videos", upload_photos: "Upload Photos", upload_documents: "Upload Documents", upload_contacts: "Upload Contacts",
    download_videos: "Download Videos", download_photos: "Download Photos", download_documents: "Download Documents", download_contacts: "Download Contacts",
    delete_own: "Delete Own", edit_own: "Edit Own",
    create_albums: "Create Albums", create_folders: "Create Folders", use_favorites: "Use Favorites",
    qr_login: "QR Login", qr_scan: "Scan QR Codes", advanced_video_play: "Advanced Video Play",
    private_access: "Private Access",
  };

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-5xl mx-auto space-y-4">
      {/* Profile hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden shadow-premium p-0">
          <div className="h-28 bg-brand-gradient" />
          <CardContent className="-mt-14 pb-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background shadow-premium-lg">
                  <AvatarFallback className="bg-white text-emerald-600 text-3xl">
                    {user.displayName?.[0]?.toUpperCase() ?? user.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
                  <Camera className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                </label>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold">{user.displayName ?? user.username}</h1>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 justify-center md:justify-start">
                  <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                  <Badge variant="outline" className={user.status === "active" ? "text-emerald-600 border-emerald-500/30" : ""}>{user.status}</Badge>
                  {hasPrivateAccess && <Badge variant="outline" className="text-amber-600 border-amber-500/30"><Lock className="w-2.5 h-2.5 mr-0.5" />Private Access</Badge>}
                  {canUpload && <Badge variant="outline" className="text-emerald-600 border-emerald-500/30"><UploadIcon className="w-2.5 h-2.5 mr-0.5" />Can Upload</Badge>}
                </div>
              </div>
              <Button variant="outline" onClick={async () => { await logout(); toast.success("Signed out"); }} className="btn-press">
                <LogOut className="w-4 h-4 mr-1.5" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { icon: Video, label: "Videos", count: profile?.storage.byType.find((b: any) => b.type === "video")?.count ?? 0, color: "from-violet-500 to-fuchsia-500" },
          { icon: ImageIcon, label: "Photos", count: profile?.storage.byType.find((b: any) => b.type === "photo")?.count ?? 0, color: "from-amber-500 to-orange-500" },
          { icon: FileText, label: "Documents", count: profile?.storage.byType.find((b: any) => b.type === "document")?.count ?? 0, color: "from-sky-500 to-blue-500" },
          { icon: UsersIcon, label: "Contacts", count: profile?.storage.byType.find((b: any) => b.type === "contact")?.count ?? 0, color: "from-emerald-500 to-teal-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }} whileHover={{ y: -3 }}>
            <Card className="p-0 shadow-premium card-hover">
              <CardContent className="pt-4 flex items-center gap-2">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold">{s.count}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <Tabs defaultValue="account">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card className="shadow-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} disabled={!editing} /></div>
                <div className="space-y-1.5"><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={!editing} /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!editing} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editing} /></div>
              </div>
              <div className="flex items-center gap-2">
                {!editing ? (
                  <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                ) : (
                  <>
                    <Button onClick={saveProfile} disabled={saving}><Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save"}</Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="shadow-premium">
            <CardContent className="pt-6 space-y-3 max-w-md">
              <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} /></div>
              <Button onClick={changePwd} disabled={saving || !currentPwd || !newPwd}>{saving ? "Updating…" : "Update Password"}</Button>
            </CardContent>
          </Card>
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <Button variant="outline" onClick={() => setView("settings")}><SettingsIcon className="w-4 h-4 mr-1.5" /> Open Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="space-y-4">
          <Card className="shadow-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4" /><span className="font-medium">Storage Usage</span></div>
              <Progress value={storagePct} className="h-2 brand-progress" />
              <div className="flex justify-between text-xs">
                <span>{formatBytes(profile?.storage.used ?? 0)} used</span>
                <span className="text-muted-foreground">{formatBytes(profile?.storage.quota ?? 0)} quota</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {(profile?.storage.byType ?? []).map((b: any) => (
                  <div key={b.type} className="text-center p-3 rounded-xl bg-muted">
                    <div className="text-2xl font-bold">{b.count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{b.type}s</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{formatBytes(b.size)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card className="shadow-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4"><Shield className="w-4 h-4" /><span className="font-medium">Your Permissions</span></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {user.permissions.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-muted/50 border">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{permLabels[p] ?? p}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
