"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { LoginPage } from "@/components/escloud/login/login-page";
import { UserApp } from "@/components/escloud/user/user-app";
import { AdminApp } from "@/components/escloud/admin/admin-app";
import { LoadingSplash } from "@/components/escloud/loading-splash";
import { MediaViewerOverlay } from "@/components/escloud/shared/media-viewer-overlay";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const loading = useAuthStore((s) => s.loading);
  const fetchSession = useAuthStore((s) => s.fetchSession);
  const view = useUIStore((s) => s.view);
  const overlay = useUIStore((s) => s.overlay);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Initialize default view based on auth state
  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === "admin" && !isImpersonating) {
        if (view === "loading" || view === "user-login" || view === "admin-login" || view === "qr-login") {
          useUIStore.getState().setView("dashboard", {});
        }
      } else {
        if (view === "loading" || view === "user-login" || view === "admin-login" || view === "qr-login") {
          useUIStore.getState().setView("home", {});
        }
      }
    } else {
      if (view !== "user-login" && view !== "admin-login" && view !== "qr-login") {
        useUIStore.getState().setView("user-login", {});
      }
    }
  }, [user, isImpersonating, loading]);

  if (loading) return <LoadingSplash />;

  if (!user) return <LoginPage />;

  if (user.role === "admin" && !isImpersonating) {
    return (
      <>
        <AdminApp />
        {overlay && <MediaViewerOverlay />}
      </>
    );
  }

  return (
    <>
      <UserApp />
      {overlay && <MediaViewerOverlay />}
    </>
  );
}
