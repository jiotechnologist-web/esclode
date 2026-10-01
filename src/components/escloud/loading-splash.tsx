"use client";
export function LoadingSplash() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="relative w-20 h-20 mb-6">
        <img src="/escloud-logo.svg" alt="Escloud" className="w-full h-full object-contain animate-pulse" />
      </div>
      <div className="text-lg font-semibold text-foreground">Escloud</div>
      <div className="mt-3 text-xs text-muted-foreground">Loading your private cloud…</div>
      <div className="mt-4 w-48 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full brand-progress animate-pulse" style={{ width: "60%" }} />
      </div>
    </div>
  );
}
