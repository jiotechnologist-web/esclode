"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore, type UserView } from "@/stores/ui";
import { useUploadStore } from "@/stores/upload";
import { hasPermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { UserShell } from "./user-shell";
import { HomeView } from "./views/home-view";
import { VideosView } from "./views/videos-view";
import { VideoPlayerView } from "./views/video-player-view";
import { PhotosView } from "./views/photos-view";
import { PhotoViewerView } from "./views/photo-viewer-view";
import { PrivateView } from "./views/private-view";
import { DocumentsView } from "./views/documents-view";
import { ContactsView } from "./views/contacts-view";
import { UploadsView } from "./views/uploads-view";
import { FavoritesView } from "./views/favorites-view";
import { RecentView } from "./views/recent-view";
import { ProfileView } from "./views/profile-view";
import { SettingsView } from "./views/settings-view";
import { UploadManagerPanel } from "@/components/escloud/upload/upload-manager-panel";
import { ImpersonationBanner } from "../shared/impersonation-banner";

export function UserApp() {
  const user = useAuthStore((s) => s.user);
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const view = useUIStore((s) => s.view) as UserView;

  // Refresh session whenever the view changes (so permissions reflect admin changes immediately)
  useEffect(() => {
    refreshSession();
  }, [view, refreshSession]);

  if (!user) return null;

  const hasPrivateAccess = hasPermission(user.permissions, PERMISSIONS.PRIVATE_ACCESS);
  const canViewPrivate = hasPermission(user.permissions, PERMISSIONS.VIEW_PRIVATE);
  const canUpload = user.uploadEnabled;
  const canViewVideos = hasPermission(user.permissions, PERMISSIONS.VIEW_VIDEOS);
  const canViewPhotos = hasPermission(user.permissions, PERMISSIONS.VIEW_PHOTOS);
  const canViewDocuments = hasPermission(user.permissions, PERMISSIONS.VIEW_DOCUMENTS);
  const canViewContacts = hasPermission(user.permissions, PERMISSIONS.VIEW_CONTACTS);
  const canViewFavorites = hasPermission(user.permissions, PERMISSIONS.VIEW_FAVORITES);
  const canViewRecent = hasPermission(user.permissions, PERMISSIONS.VIEW_RECENT);
  const canViewUploads = hasPermission(user.permissions, PERMISSIONS.VIEW_UPLOADS);
  const canScanQR = hasPermission(user.permissions, PERMISSIONS.QR_SCAN);

  // Private menu shows if the user has either PRIVATE_ACCESS (their own private content)
  // OR VIEW_PRIVATE (can see private content shared with them)
  const showPrivateMenu = hasPrivateAccess || canViewPrivate;

  const navItems: { key: UserView; label: string; icon: any; enabled: boolean; isPrivate?: boolean; isSystem?: boolean }[] = [
    { key: "home", label: "Home", icon: Home, enabled: true, isSystem: true },
    { key: "videos", label: "Videos", icon: Video, enabled: canViewVideos },
    { key: "photos", label: "Photos", icon: Image, enabled: canViewPhotos },
    { key: "private", label: "Private", icon: Lock, enabled: showPrivateMenu, isPrivate: true },
    { key: "documents", label: "Documents", icon: FileText, enabled: canViewDocuments },
    { key: "contacts", label: "Contacts", icon: Users, enabled: canViewContacts },
    { key: "uploads", label: "Uploads", icon: Upload, enabled: canViewUploads && canUpload },
    { key: "favorites", label: "Favorites", icon: Heart, enabled: canViewFavorites },
    { key: "recent", label: "Recent", icon: History, enabled: canViewRecent },
    { key: "settings", label: "Settings", icon: SettingsIcon, enabled: true },
    { key: "profile", label: "Profile", icon: UserCircle, enabled: true, isSystem: true },
  ];

  return (
    <>
      <ImpersonationBanner />
      <UserShell navItems={navItems}>
        <div className="fade-in">
          {view === "home" && <HomeView />}
          {view === "videos" && <VideosView />}
          {view === "video-player" && <VideoPlayerView />}
          {view === "photos" && <PhotosView />}
          {view === "photo-viewer" && <PhotoViewerView />}
          {view === "private" && <PrivateView />}
          {view === "documents" && <DocumentsView />}
          {view === "contacts" && <ContactsView />}
          {view === "uploads" && <UploadsView />}
          {view === "favorites" && <FavoritesView />}
          {view === "recent" && <RecentView />}
          {view === "settings" && <SettingsView />}
          {view === "profile" && <ProfileView />}
        </div>
      </UserShell>
      <UploadManagerPanel />
    </>
  );
}

import {
  Home,
  Video,
  Image,
  Lock,
  FileText,
  Users,
  Upload,
  Heart,
  History,
  UserCircle,
  Settings as SettingsIcon,
} from "lucide-react";
