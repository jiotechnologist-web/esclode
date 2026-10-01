"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore, type AdminView } from "@/stores/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "../shared/global-search";
import {
  Sun, Moon, Monitor, LogOut, Shield, Cloud, Menu, X, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  key: AdminView;
  label: string;
  icon: any;
}

interface Props {
  navItems: NavItem[];
  children: React.ReactNode;
}

const ADMIN_SYSTEM_ITEMS: AdminView[] = ["dashboard", "admin-profile"];

export function AdminShell({ navItems, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const view = useUIStore((s) => s.view) as AdminView;
  const setView = useUIStore((s) => s.setView);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const mobileOpen = useUIStore((s) => s.mobileOpen);
  const setMobileOpen = useUIStore((s) => s.setMobileOpen);
  const logout = useAuthStore((s) => s.logout);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) return null;

  const primaryNav = navItems.slice(0, 4);
  const moreNav = navItems.slice(4);
  if (!primaryNav.some((i) => i.key === "dashboard")) {
    primaryNav.unshift(navItems.find((i) => i.key === "dashboard")!);
  }

  const active = navItems.find((i) => i.key === view) ?? navItems[0];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* === Desktop Sidebar === */}
      <motion.aside
        initial={{ x: -260, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar/80 backdrop-blur-xl"
        style={{ width: sidebarCollapsed ? 80 : 260 }}
      >
        {/* Brand header */}
        <div className="px-4 py-4 flex items-center gap-3 border-b border-border/60">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center shadow-brand"
          >
            <Shield className="w-5 h-5 text-white" />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="min-w-0"
              >
                <div className="font-semibold leading-tight text-brand-gradient">Escloud Admin</div>
                <div className="text-[11px] text-muted-foreground">Control Center</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scroll-thin">
          {navItems.map((item, i) => {
            const isActive = view === item.key;
            return (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setView(item.key)}
                whileHover={{ x: 2 }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left nav-item relative",
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-brand"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!sidebarCollapsed && isActive && (
                  <motion.div
                    layoutId="adminActiveIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white/40"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-2 border-t border-border/60 space-y-1">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">
                {user.displayName?.[0]?.toUpperCase() ?? "A"}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    {user.displayName ?? user.username}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => setTheme("light")} title="Light">
              <Sun className={cn("w-3.5 h-3.5", theme === "light" && "text-primary")} />
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => setTheme("dark")} title="Dark">
              <Moon className={cn("w-3.5 h-3.5", theme === "dark" && "text-primary")} />
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 h-8" onClick={() => setTheme("system")} title="System">
              <Monitor className={cn("w-3.5 h-3.5", theme === "system" && "text-primary")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8"
              onClick={async () => {
                await logout();
                toast.success("Signed out");
              }}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? "→" : "← Collapse"}
          </Button>
        </div>
      </motion.aside>

      {/* === Main content === */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 glass-strong border-b border-border/60">
          <div className="flex items-center gap-2 px-3 md:px-6 py-3 pt-safe">
            <Button variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-600 to-cyan-600 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-brand-gradient">Admin</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {active && (
                <>
                  <active.icon className="w-4 h-4 text-muted-foreground" />
                  <h1 className="text-base font-semibold">{active.label}</h1>
                </>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="hidden md:flex text-[11px]">
                <Shield className="w-3 h-3 mr-1 text-emerald-500" /> Admin
              </Badge>
              <GlobalSearch />
            </div>
          </div>
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden border-t border-border/60 overflow-hidden"
              >
                <nav className="p-2 grid grid-cols-2 gap-1">
                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        setView(item.key);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors",
                        view === item.key ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-brand" : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      await logout();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-500 hover:bg-rose-500/10"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </nav>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 pb-20 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="page-enter"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* === Mobile bottom nav === */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong border-t border-border/60 pb-safe">
          <div className="grid max-w-md mx-auto" style={{ gridTemplateColumns: `repeat(${Math.min(5, primaryNav.length + (moreNav.length > 0 ? 1 : 0))}, minmax(0, 1fr))` }}>
            {primaryNav.map((item) => {
              const isActive = view === item.key;
              return (
                <motion.button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  whileTap={{ scale: 0.92 }}
                  className={cn("flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] min-w-0", isActive ? "text-primary" : "text-muted-foreground")}
                >
                  <motion.div animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 350, damping: 20 }}>
                    <item.icon className="w-5 h-5" />
                  </motion.div>
                  <span className="truncate max-w-full">{item.label.split(" ")[0]}</span>
                </motion.button>
              );
            })}
            {moreNav.length > 0 && (
              <motion.button
                onClick={() => setMoreOpen(true)}
                whileTap={{ scale: 0.92 }}
                className="flex flex-col items-center gap-0.5 py-2.5 px-1 text-[10px] text-muted-foreground"
              >
                <MoreHorizontal className="w-5 h-5" />
                <span>More</span>
              </motion.button>
            )}
          </div>
        </nav>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl border-t-2 border-border/60">
          <SheetHeader>
            <SheetTitle className="text-base">More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-4 gap-2 px-2 pb-6 pt-2">
            {moreNav.map((item, i) => (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  setView(item.key);
                  setMoreOpen(false);
                }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
