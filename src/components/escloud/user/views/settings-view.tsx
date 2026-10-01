"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  User, Settings, Video as VideoIcon, Shield, Camera, Save, Loader2,
  QrCode, Navigation, Eye, EyeOff, Lock, Image as ImageIcon,
  LogOut, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { QRScanner } from "../../qr/qr-scanner";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavPref {
  primaryItems: string[];
  hiddenItems: string[];
  preloadVideos: boolean;
  advancedVideoPlay: boolean;
  preferredQuality: string;
  autoQuality: boolean;
  preBufferLevel: string;
  dataSaver: boolean;
  reelsEnabled: boolean;
  videoRotation: number;
}

const ALL_NAV_ITEMS = [
  { key: "home", label: "Home", system: true },
  { key: "videos", label: "Videos", system: false },
  { key: "photos", label: "Photos", system: false },
  { key: "private", label: "Private", system: false },
  { key: "documents", label: "Documents", system: false },
  { key: "contacts", label: "Contacts", system: false },
  { key: "uploads", label: "Uploads", system: false },
  { key: "favorites", label: "Favorites", system: false },
  { key: "recent", label: "Recent", system: false },
  { key: "profile", label: "Profile", system: true },
];

export function SettingsView() {
  const user = useAuthStore((s) => s.user)!;
  const logout = useAuthStore((s) => s.logout);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const setNavPrefs = useUIStore((s) => s.setNavPrefs);
  const setVideoPrefs = useUIStore((s) => s.setVideoPrefs);
  const [pref, setPref] = useState<NavPref | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      await refreshSession();
      const r = await fetch("/api/user/nav-prefs");
      const d = await r.json();
      setPref({
        primaryItems: d.primaryItems ?? [],
        hiddenItems: d.hiddenItems ?? [],
        preloadVideos: d.preloadVideos ?? true,
        advancedVideoPlay: d.advancedVideoPlay ?? true,
        preferredQuality: d.preferredQuality ?? "auto",
        autoQuality: d.autoQuality ?? true,
        preBufferLevel: d.preBufferLevel ?? "adaptive",
        dataSaver: d.dataSaver ?? false,
        reelsEnabled: d.reelsEnabled ?? false,
        videoRotation: d.videoRotation ?? 0,
      });
      setNavPrefs({ primaryItems: d.primaryItems ?? [], hiddenItems: d.hiddenItems ?? [] });
      setVideoPrefs({
        preloadVideos: d.preloadVideos ?? true,
        advancedVideoPlay: d.advancedVideoPlay ?? true,
        preferredQuality: d.preferredQuality ?? "auto",
        autoQuality: d.autoQuality ?? true,
        preBufferLevel: d.preBufferLevel ?? "adaptive",
        dataSaver: d.dataSaver ?? false,
        reelsEnabled: d.reelsEnabled ?? false,
        videoRotation: d.videoRotation ?? 0,
      });
      // Also load profile
      try {
        const pr = await fetch("/api/profile").then((r) => r.json());
        setProfile(pr);
        setDisplayName(pr.profile?.displayName ?? "");
        setEmail(pr.profile?.email ?? "");
        setPhone(pr.profile?.phone ?? "");
        if (pr.profile?.avatarUrl) setAvatarUrl(pr.profile.avatarUrl + "&t=" + Date.now());
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const savePref = async (updates: Partial<NavPref>) => {
    setSaving(true);
    try {
      const body = { ...pref, ...updates };
      const r = await fetch("/api/user/nav-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNavPrefs({ primaryItems: d.primaryItems ?? [], hiddenItems: d.hiddenItems ?? [] });
      setVideoPrefs({
        preloadVideos: d.preloadVideos,
        advancedVideoPlay: d.advancedVideoPlay,
        preferredQuality: d.preferredQuality,
        autoQuality: d.autoQuality,
        preBufferLevel: d.preBufferLevel,
        dataSaver: d.dataSaver,
        reelsEnabled: d.reelsEnabled,
        videoRotation: d.videoRotation,
      });
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, phone }),
      });
      if (!r.ok) throw new Error("Failed");
      toast.success("Profile updated");
      refreshSession();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const changePwd = async () => {
    if (!currentPwd || !newPwd) return;
    if (newPwd.length < 6) { toast.error("Password too short"); return; }
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
    setSaving(true);
    try {
      const r = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Avatar updated");
      setAvatarUrl((d.avatarUrl ?? "") + "&t=" + Date.now());
      refreshSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type: "profile" } }));
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !pref) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const canScanQR = hasPermission(user.permissions, PERMISSIONS.QR_SCAN);
  const hasPrivateAccess = hasPermission(user.permissions, PERMISSIONS.PRIVATE_ACCESS);

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-4xl mx-auto space-y-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-brand">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground">Personalize your Escloud experience</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="account">
        <TabsList className="flex-wrap h-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1">
          <TabsTrigger value="account" className="text-xs">Account</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
          <TabsTrigger value="privacy" className="text-xs">Privacy</TabsTrigger>
          <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
          <TabsTrigger value="video" className="text-xs">Video/Reels</TabsTrigger>
          <TabsTrigger value="playback" className="text-xs">Playback</TabsTrigger>
          <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
          <TabsTrigger value="navigation" className="text-xs">Navigation</TabsTrigger>
        </TabsList>

        {/* Account tab */}
        <TabsContent value="account" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Account Information</CardTitle>
              <CardDescription className="text-xs">Update your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input value={user.username} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Name</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <Button onClick={saveProfile} disabled={saving} className="bg-brand-gradient text-white btn-press">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save Account"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Profile Photo</CardTitle>
              <CardDescription className="text-xs">Upload or change your profile photo</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-background shadow-md">
                <AvatarFallback className="bg-brand-gradient text-white text-2xl">
                  {user.displayName?.[0]?.toUpperCase() ?? user.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-2">
                  Your profile photo appears on your profile, comments, and notifications.
                </p>
                <label className="cursor-pointer inline-block">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
                  <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                    {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Camera className="w-4 h-4 mr-1.5" />}
                    {saving ? "Uploading…" : "Upload New Photo"}
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Privacy & Access</CardTitle>
              <CardDescription className="text-xs">View your access permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="text-sm font-medium">Private Access</div>
                  <div className="text-xs text-muted-foreground">Allows uploading and viewing private content</div>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", hasPrivateAccess ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                  {hasPrivateAccess ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Contact your administrator to request access changes.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media tab */}
        <TabsContent value="media" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Media Settings</CardTitle>
              <CardDescription className="text-xs">Control how images and documents are displayed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Show thumbnails" desc="Display preview thumbnails in galleries" value={true} onChange={() => toast.info("Always enabled")} />
              <ToggleRow label="Lazy load images" desc="Only load images as they scroll into view" value={true} onChange={() => toast.info("Always enabled")} />
              <ToggleRow label="Auto-generate thumbnails" desc="Generate preview images for videos on upload" value={true} onChange={() => toast.info("Always enabled")} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video / Reels tab */}
        <TabsContent value="video" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><VideoIcon className="w-4 h-4" /> Video / Reels Mode</CardTitle>
              <CardDescription className="text-xs">Configure video playback and Reels experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Reels / Shorts Mode" desc="Open videos in vertical swipe interface (Reels-style)" value={pref.reelsEnabled} onChange={(v) => { setPref({ ...pref, reelsEnabled: v }); savePref({ reelsEnabled: v }); }} />
              <ToggleRow label="Preload Videos" desc="Pre-buffer video content for smoother playback (recommended)" value={pref.preloadVideos} onChange={(v) => { setPref({ ...pref, preloadVideos: v }); savePref({ preloadVideos: v }); }} />
              <ToggleRow label="Advanced Video Play" desc="Smart adaptive buffering and quality" value={pref.advancedVideoPlay} onChange={(v) => { setPref({ ...pref, advancedVideoPlay: v }); savePref({ advancedVideoPlay: v }); }} />
              <ToggleRow label="Auto Quality" desc="Automatically adjust quality based on network" value={pref.autoQuality} onChange={(v) => { setPref({ ...pref, autoQuality: v }); savePref({ autoQuality: v }); }} />
              <ToggleRow label="Data Saver" desc="Reduce bandwidth usage on mobile networks" value={pref.dataSaver} onChange={(v) => { setPref({ ...pref, dataSaver: v }); savePref({ dataSaver: v }); }} />
              <div className="space-y-1.5">
                <Label>Preferred Quality</Label>
                <Select value={pref.preferredQuality} onValueChange={(v) => { setPref({ ...pref, preferredQuality: v }); savePref({ preferredQuality: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="480p">480p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pre-buffer Level</Label>
                <Select value={pref.preBufferLevel} onValueChange={(v) => { setPref({ ...pref, preBufferLevel: v }); savePref({ preBufferLevel: v }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adaptive">Adaptive (recommended)</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default Video Rotation</Label>
                <Select value={String(pref.videoRotation)} onValueChange={(v) => { setPref({ ...pref, videoRotation: Number(v) }); savePref({ videoRotation: Number(v) }); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0° (Normal)</SelectItem>
                    <SelectItem value="90">90° Clockwise</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">90° Counter-clockwise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Playback tab */}
        <TabsContent value="playback" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4" /> Playback</CardTitle>
              <CardDescription className="text-xs">Configure how videos play back</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ToggleRow label="Autoplay next video" desc="Automatically play the next video when one ends" value={pref.reelsEnabled} onChange={(v) => { setPref({ ...pref, reelsEnabled: v }); savePref({ reelsEnabled: v }); }} />
              <ToggleRow label="Resume from last position" desc="Continue watching from where you left off" value={true} onChange={() => toast.info("Always enabled")} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security tab */}
        <TabsContent value="security" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Change Password</CardTitle>
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
              <Button onClick={changePwd} disabled={saving || !currentPwd || !newPwd} className="bg-brand-gradient text-white btn-press">Update Password</Button>
            </CardContent>
          </Card>
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><QrCode className="w-4 h-4" /> QR Code Scanner</CardTitle>
              <CardDescription className="text-xs">Scan a PC login QR code from your mobile device</CardDescription>
            </CardHeader>
            <CardContent>
              {!canScanQR ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
                  You don't have permission to scan QR codes. Ask your administrator to grant the "Scan QR Codes" permission.
                </div>
              ) : (
                <Button onClick={() => setShowScanner(true)} className="bg-brand-gradient text-white btn-press">
                  <Camera className="w-4 h-4 mr-2" /> Open Scanner
                </Button>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-premium border-rose-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-rose-500"><LogOut className="w-4 h-4" /> Sign Out</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={async () => { await logout(); toast.success("Signed out"); }} className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 btn-press">Sign Out</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation tab */}
        <TabsContent value="navigation" className="space-y-4">
          <Card className="shadow-premium">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Navigation className="w-4 h-4" /> Mobile Navigation</CardTitle>
              <CardDescription className="text-xs">Choose up to 5 items for the primary bottom bar. Others go to "More" menu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Primary Items ({pref.primaryItems.length}/5)</div>
                {pref.primaryItems.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg">
                    No primary items selected. Default order will be used.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {pref.primaryItems.map((key) => {
                      const item = ALL_NAV_ITEMS.find((x) => x.key === key);
                      if (!item) return null;
                      return (
                        <div key={key} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                          <span className="flex-1 text-sm">{item.label}{item.system && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full bg-muted">System</span>}</span>
                          {!item.system && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500" onClick={() => {
                              const next = pref.primaryItems.filter((k) => k !== key);
                              setPref({ ...pref, primaryItems: next });
                              savePref({ primaryItems: next });
                            }}>
                              <EyeOff className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Available Items</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_NAV_ITEMS.map((item) => {
                    const isPrimary = pref.primaryItems.includes(item.key);
                    const isHidden = pref.hiddenItems.includes(item.key);
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          if (isHidden) {
                            const next = pref.hiddenItems.filter((k) => k !== item.key);
                            setPref({ ...pref, hiddenItems: next });
                            savePref({ hiddenItems: next });
                          } else {
                            if (isPrimary) {
                              const next = pref.primaryItems.filter((k) => k !== item.key);
                              setPref({ ...pref, primaryItems: next });
                              savePref({ primaryItems: next });
                            } else {
                              if (pref.primaryItems.length >= 5) {
                                toast.error("Maximum 5 primary items. Remove one first.");
                                return;
                              }
                              const next = [...pref.primaryItems, item.key];
                              setPref({ ...pref, primaryItems: next });
                              savePref({ primaryItems: next });
                            }
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-colors",
                          isPrimary ? "border-primary bg-primary/5 text-primary" : isHidden ? "border-muted opacity-50" : "hover:bg-accent"
                        )}
                      >
                        {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onScanned={() => {
            setShowScanner(false);
            toast.success("QR scanned — authorizing PC login…");
          }}
        />
      )}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
