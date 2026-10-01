"use client";
import { useAuthStore } from "@/stores/auth";
import { useUIStore, type AdminView } from "@/stores/ui";
import { AdminShell } from "./admin-shell";
import { AdminDashboardView } from "./views/dashboard-view";
import { AdminUsersView } from "./views/users-view";
import { AdminUserDetailView } from "./views/user-detail-view";
import { AdminMediaView } from "./views/media-view";
import { AdminLogsView } from "./views/logs-view";
import { AdminSettingsView } from "./views/settings-view";
import { AdminProfileView } from "./views/admin-profile-view";
import { AdminUploadsView } from "./views/uploads-view";
import { UploadManagerPanel } from "@/components/escloud/upload/upload-manager-panel";

import {
  LayoutDashboard, Users, Folder, ScrollText, Settings, UserCog, Upload,
} from "lucide-react";

const navItems: { key: AdminView; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
  { key: "media", label: "Media", icon: Folder },
  { key: "uploads", label: "Upload", icon: Upload },
  { key: "logs", label: "Activity Log", icon: ScrollText },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "admin-profile", label: "Admin Profile", icon: UserCog },
];

export function AdminApp() {
  const user = useAuthStore((s) => s.user);
  const view = useUIStore((s) => s.view) as AdminView;

  if (!user) return null;

  return (
    <AdminShell navItems={navItems}>
      <div className="fade-in">
        {view === "dashboard" && <AdminDashboardView />}
        {view === "users" && <AdminUsersView />}
        {view === "user-detail" && <AdminUserDetailView />}
        {view === "media" && <AdminMediaView />}
        {view === "uploads" && <AdminUploadsView />}
        {view === "logs" && <AdminLogsView />}
        {view === "settings" && <AdminSettingsView />}
        {view === "admin-profile" && <AdminProfileView />}
      </div>
    </AdminShell>
  );
}
