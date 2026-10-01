"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Lock, Save, LogOut, Camera, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";

export function AdminProfileView() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const [profile, setProfile] = useState<any>(null);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  const load = async () => {
    try {
      const r = await fetch("/api/profile");
      const d = await r.json();
      setProfile(d);
      setMustChange(d.profile?.mustChangePwd ?? false);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const changePwd = async () => {
    if (!currentPwd || !newPwd) return;
    if (newPwd.length < 6) return toast.error("Password too short");
    setSaving(true);
    try {
      const r = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: currentPwd, next: newPwd }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Password changed");
      setCurrentPwd("");
      setNewPwd("");
      setMustChange(false);
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

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-4xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-center md:items-start gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-emerald-600 text-white text-2xl">
                {user.displayName?.[0]?.toUpperCase() ?? "A"}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
              <Camera className="w-3 h-3" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              {user.displayName ?? user.username}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex items-center gap-1 justify-center md:justify-start">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Administrator</span>
            </div>
          </div>
          <Button variant="outline" onClick={async () => { await logout(); toast.success("Signed out"); }}>
            <LogOut className="w-4 h-4 mr-1.5" /> Logout
          </Button>
        </CardContent>
      </Card>

      {mustChange && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            You are using the default administrator password. Please change it.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-md">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
              </div>
              <Button onClick={changePwd} disabled={saving || !currentPwd || !newPwd}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                {saving ? "Saving…" : "Update Password"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Username</span><span>{user.username}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user.email}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Role</span><span>Administrator</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Permissions</span><span>{user.permissions.length} capabilities</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Storage quota</span><span>{(user.storageQuota / 1024 / 1024 / 1024).toFixed(1)} GB</span></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
