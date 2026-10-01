"use client";
import { useEffect } from "react";
import { useUIStore } from "@/stores/ui";

export function ThemeBootstrap() {
  const applyTheme = useUIStore((s) => s.applyTheme);
  useEffect(() => {
    const stored = (localStorage.getItem("escloud-theme") as any) ?? "system";
    useUIStore.getState().setTheme(stored);
    applyTheme();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [applyTheme]);
  return null;
}
