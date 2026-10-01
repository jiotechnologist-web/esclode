"use client";
import { useEffect } from "react";
import { useUploadStore } from "@/stores/upload";

/**
 * Real-time UI sync hook (requirement #14).
 *
 * Whenever an upload completes or a media is deleted/updated, broadcast
 * a global event so any view listening to it can refetch its data.
 *
 * Usage in views:
 *   useRealtimeSync(() => refreshMyList());
 *
 * Usage to broadcast (from upload store, delete handlers, etc.):
 *   window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type: "media" } }));
 */

export function useRealtimeSync(callback: () => void, deps: any[] = []) {
  useEffect(() => {
    const handler = () => callback();
    window.addEventListener("escloud-data-changed", handler);
    // Also listen for upload completion events from the upload store
    const unsubFinish = useUploadStore.subscribe((state, prev) => {
      const newlyCompleted = state.jobs.filter(
        (j) => j.status === "completed" && prev.jobs.find((p) => p.id === j.id)?.status !== "completed"
      );
      if (newlyCompleted.length > 0) {
        // Defer to allow DB write to complete
        setTimeout(() => callback(), 300);
      }
    });
    return () => {
      window.removeEventListener("escloud-data-changed", handler);
      unsubFinish();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function broadcastDataChange(type: string = "media") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("escloud-data-changed", { detail: { type } }));
}
