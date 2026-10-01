"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AdminSettingsView() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/settings");
        const d = await r.json();
        setSettings(d.settings ?? {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!r.ok) throw new Error("Failed");
      toast.success("Settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const set = (k: string, v: string) => setSettings({ ...settings, [k]: v });
  const setBool = (k: string, v: boolean) => setSettings({ ...settings, [k]: v ? "on" : "off" });

  return (
    <div className="px-3 md:px-6 py-4 md:py-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Settings</h1>
          <p className="text-sm text-muted-foreground">Platform-wide configuration</p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-brand-gradient text-white">
          <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application</CardTitle>
          <CardDescription className="text-xs">Branding and registration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Application name</Label>
            <Input value={settings["app.name"] ?? ""} onChange={(e) => set("app.name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default theme</Label>
            <select
              value={settings["app.theme"] ?? "system"}
              onChange={(e) => set("app.theme", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <ToggleRow label="Enable user registration" desc="Allow public sign-up" value={settings["registration.enabled"] === "on"} onChange={(v) => setBool("registration.enabled", v)} />
          <ToggleRow label="Maintenance mode" desc="Block normal users from access" value={settings["maintenance.mode"] === "on"} onChange={(v) => setBool("maintenance.mode", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video Streaming</CardTitle>
          <CardDescription className="text-xs">Advanced Video Play defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow label="Advanced Video Play (default)" value={settings["video.advanced_default"] === "on"} onChange={(v) => setBool("video.advanced_default", v)} />
          <div className="space-y-1.5">
            <Label>Default preferred quality</Label>
            <select
              value={settings["video.default_quality"] ?? "auto"}
              onChange={(e) => set("video.default_quality", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="auto">Auto</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Default pre-buffer level</Label>
            <select
              value={settings["video.pre_buffer_level"] ?? "adaptive"}
              onChange={(e) => set("video.pre_buffer_level", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="adaptive">Adaptive</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <ToggleRow label="Data Saver (default)" value={settings["video.data_saver_default"] === "on"} onChange={(v) => setBool("video.data_saver_default", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security & Sessions</CardTitle>
          <CardDescription className="text-xs">Authentication and QR settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Session timeout (minutes)</Label>
            <Input
              type="number"
              value={settings["session.timeout_minutes"] ?? "43200"}
              onChange={(e) => set("session.timeout_minutes", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>QR login expiry (seconds)</Label>
            <Input
              type="number"
              value={settings["qr.ttl_seconds"] ?? "180"}
              onChange={(e) => set("qr.ttl_seconds", e.target.value)}
            />
          </div>
          <ToggleRow label="Upload approval required (global)" desc="User uploads require admin approval" value={settings["upload.approval_required"] === "on"} onChange={(v) => setBool("upload.approval_required", v)} />
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-lg border">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
