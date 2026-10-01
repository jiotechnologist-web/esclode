"use client";
import { useAuthStore } from "@/stores/auth";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ImpersonationBanner() {
  const isImpersonating = useAuthStore((s) => s.isImpersonating);
  const admin = useAuthStore((s) => s.impersonatingAdmin);
  const user = useAuthStore((s) => s.user);
  const fetchSession = useAuthStore((s) => s.fetchSession);

  if (!isImpersonating || !admin) return null;

  const stopImpersonation = async () => {
    try {
      const r = await fetch("/api/admin/users/[id]/impersonate", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      toast.success("Returned to admin panel");
      fetchSession();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to exit impersonation");
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-amber-500/15 border-b border-amber-500/30 backdrop-blur px-3 py-2 flex items-center gap-3">
      <Shield className="w-4 h-4 text-amber-600" />
      <div className="text-xs flex-1 truncate">
        <span className="font-semibold text-amber-700 dark:text-amber-400">
          Admin impersonation active
        </span>
        <span className="text-muted-foreground"> — viewing as {user?.displayName ?? user?.username} (admin: {admin.username})</span>
      </div>
      <Button size="sm" variant="outline" onClick={stopImpersonation}>
        <LogOut className="w-3.5 h-3.5 mr-1.5" /> Exit
      </Button>
    </div>
  );
}
