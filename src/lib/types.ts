// Shared TypeScript types for Escloud front + back
import type { MediaType } from "./storage";

export interface ApiMediaItem {
  id: string;
  type: MediaType;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: "public" | "private";
  status: string;
  approvalStatus: string;
  ownerId: string;
  ownerName: string | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  downloadUrl: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  resolution: string | null;
  hlsPath: string | null;
  docType: string | null;
  contactName: string | null;
  contactCount: number | null;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  isFavorite: boolean;
  watchProgress?: number | null;
}

export interface ApiUserListItem {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  status: string;
  phone: string | null;
  avatarUrl: string | null;
  permissions: string[];
  storageQuota: number;
  usedStorage: number;
  uploadEnabled: boolean;
  downloadEnabled: boolean;
  approvalRequired: boolean;
  expiresAt: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  mediaCount: number;
}

export interface ApiAdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalVideos: number;
  totalPhotos: number;
  totalDocuments: number;
  totalContacts: number;
  privateFiles: number;
  storageUsed: number;
  storageRemaining: number;
  pendingUploads: number;
  totalDownloads: number;
  totalUploads: number;
  uploadsByDay: { date: string; count: number; bytes: number }[];
  downloadsByDay: { date: string; count: number; bytes: number }[];
  storageByType: { type: string; bytes: number; count: number }[];
}

export interface ApiActivityLogItem {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  targetUserId: string | null;
  targetUserName: string | null;
  action: string;
  targetContent: string | null;
  metadata: any;
  ip: string | null;
  createdAt: string;
}

export interface ApiSessionItem {
  id: string;
  device: string | null;
  browser: string | null;
  ip: string | null;
  lastActive: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export interface ApiUploadItem {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  totalChunks: number;
  receivedChunks: number;
  status: string;
  progress: number; // 0..1
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  mediaId: string | null;
}

export interface ApiNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}
