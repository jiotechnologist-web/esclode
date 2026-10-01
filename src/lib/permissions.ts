// Escloud - Granular permissions
export const PERMISSIONS = {
  // View
  VIEW_VIDEOS: "view_videos",
  VIEW_PHOTOS: "view_photos",
  VIEW_PRIVATE: "view_private",
  VIEW_DOCUMENTS: "view_documents",
  VIEW_CONTACTS: "view_contacts",
  VIEW_FAVORITES: "view_favorites",
  VIEW_RECENT: "view_recent",
  VIEW_UPLOADS: "view_uploads",
  // Upload
  UPLOAD_VIDEOS: "upload_videos",
  UPLOAD_PHOTOS: "upload_photos",
  UPLOAD_DOCUMENTS: "upload_documents",
  UPLOAD_CONTACTS: "upload_contacts",
  // Download
  DOWNLOAD_VIDEOS: "download_videos",
  DOWNLOAD_PHOTOS: "download_photos",
  DOWNLOAD_DOCUMENTS: "download_documents",
  DOWNLOAD_CONTACTS: "download_contacts",
  // Manage own
  DELETE_OWN: "delete_own",
  EDIT_OWN: "edit_own",
  // Organize
  CREATE_ALBUMS: "create_albums",
  CREATE_FOLDERS: "create_folders",
  USE_FAVORITES: "use_favorites",
  // Sharing
  SHARE: "share",
  // QR login
  QR_LOGIN: "qr_login",
  QR_SCAN: "qr_scan",
  // Advanced video
  ADVANCED_VIDEO_PLAY: "advanced_video_play",
  // Private access — admin grants per-user. Required to upload private content
  // and to view private content shared with the user.
  PRIVATE_ACCESS: "private_access",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];

// Default permission set for a regular user (PRIVATE_ACCESS is granted separately by admin)
export const DEFAULT_USER_PERMISSIONS: string[] = [
  PERMISSIONS.VIEW_VIDEOS,
  PERMISSIONS.VIEW_PHOTOS,
  PERMISSIONS.VIEW_DOCUMENTS,
  PERMISSIONS.VIEW_CONTACTS,
  PERMISSIONS.VIEW_FAVORITES,
  PERMISSIONS.VIEW_RECENT,
  PERMISSIONS.VIEW_UPLOADS,
  PERMISSIONS.UPLOAD_VIDEOS,
  PERMISSIONS.UPLOAD_PHOTOS,
  PERMISSIONS.UPLOAD_DOCUMENTS,
  PERMISSIONS.UPLOAD_CONTACTS,
  PERMISSIONS.DOWNLOAD_VIDEOS,
  PERMISSIONS.DOWNLOAD_PHOTOS,
  PERMISSIONS.DOWNLOAD_DOCUMENTS,
  PERMISSIONS.DOWNLOAD_CONTACTS,
  PERMISSIONS.DELETE_OWN,
  PERMISSIONS.EDIT_OWN,
  PERMISSIONS.CREATE_ALBUMS,
  PERMISSIONS.CREATE_FOLDERS,
  PERMISSIONS.USE_FAVORITES,
  PERMISSIONS.QR_LOGIN,
  PERMISSIONS.QR_SCAN,
  PERMISSIONS.ADVANCED_VIDEO_PLAY,
];

// Permissions that the admin can toggle for a user via the UI
export const ADMIN_TOGGLEABLE_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: PERMISSIONS.VIEW_VIDEOS, label: "View Videos", group: "View" },
  { key: PERMISSIONS.VIEW_PHOTOS, label: "View Photos", group: "View" },
  { key: PERMISSIONS.VIEW_DOCUMENTS, label: "View Documents", group: "View" },
  { key: PERMISSIONS.VIEW_CONTACTS, label: "View Contacts", group: "View" },
  { key: PERMISSIONS.VIEW_FAVORITES, label: "View Favorites", group: "View" },
  { key: PERMISSIONS.VIEW_RECENT, label: "View Recent", group: "View" },
  { key: PERMISSIONS.VIEW_UPLOADS, label: "View Uploads", group: "View" },
  { key: PERMISSIONS.VIEW_PRIVATE, label: "View Shared Private Content", group: "View" },
  { key: PERMISSIONS.PRIVATE_ACCESS, label: "Private Access", group: "Private" },
  { key: PERMISSIONS.UPLOAD_VIDEOS, label: "Upload Videos", group: "Upload" },
  { key: PERMISSIONS.UPLOAD_PHOTOS, label: "Upload Photos", group: "Upload" },
  { key: PERMISSIONS.UPLOAD_DOCUMENTS, label: "Upload Documents", group: "Upload" },
  { key: PERMISSIONS.UPLOAD_CONTACTS, label: "Upload Contacts", group: "Upload" },
  { key: PERMISSIONS.DOWNLOAD_VIDEOS, label: "Download Videos", group: "Download" },
  { key: PERMISSIONS.DOWNLOAD_PHOTOS, label: "Download Photos", group: "Download" },
  { key: PERMISSIONS.DOWNLOAD_DOCUMENTS, label: "Download Documents", group: "Download" },
  { key: PERMISSIONS.DOWNLOAD_CONTACTS, label: "Download Contacts", group: "Download" },
  { key: PERMISSIONS.DELETE_OWN, label: "Delete Own Uploads", group: "Manage" },
  { key: PERMISSIONS.EDIT_OWN, label: "Edit Own Uploads", group: "Manage" },
  { key: PERMISSIONS.CREATE_ALBUMS, label: "Create Albums", group: "Organize" },
  { key: PERMISSIONS.CREATE_FOLDERS, label: "Create Folders", group: "Organize" },
  { key: PERMISSIONS.USE_FAVORITES, label: "Use Favorites", group: "Organize" },
  { key: PERMISSIONS.QR_LOGIN, label: "Use QR Login", group: "Security" },
  { key: PERMISSIONS.QR_SCAN, label: "Scan QR Codes", group: "Security" },
  { key: PERMISSIONS.ADVANCED_VIDEO_PLAY, label: "Advanced Video Play", group: "Video" },
];

export function hasPermission(perms: string[] | null | undefined, key: string): boolean {
  if (!perms) return false;
  return perms.includes(key);
}

export function parsePermissions(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function serializePermissions(perms: string[]): string {
  return JSON.stringify(perms);
}
