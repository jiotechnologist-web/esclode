"use client";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useUIStore, type LoginView } from "@/stores/ui";
import { QRLoginPanel } from "@/components/escloud/qr/qr-login-panel";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff, Lock, User as UserIcon, Shield, Loader2, ArrowLeft, QrCode, Sun, Moon, Monitor, Cloud, Sparkles, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginPage() {
  const view = useUIStore((s) => s.view) as LoginView;
  const setView = useUIStore((s) => s.setView);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const fetchSession = useAuthStore((s) => s.fetchSession);

  // 10-tap shortcut to reveal admin login
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<any>(null);
  const [tapProgress, setTapProgress] = useState(0);

  const handleLoginAreaTap = () => {
    tapCountRef.current += 1;
    setTapProgress(tapCountRef.current);
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
      setTapProgress(0);
    }, 1200);
    if (tapCountRef.current >= 10) {
      tapCountRef.current = 0;
      setTapProgress(0);
      setView("admin-login");
      toast.success("Admin entry revealed", { description: "Please authenticate with administrator credentials." });
    }
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-background">
      {/* === LEFT: Brand showcase (desktop only) === */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-emerald-600 via-cyan-600 to-blue-700">
        {/* Animated background blobs */}
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-cyan-300/30 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 20, 0], y: [0, 25, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-teal-300/25 blur-3xl"
        />

        {/* Top brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-2xl glass-strong flex items-center justify-center shadow-brand-lg">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white text-xl font-bold tracking-tight">Escloud</div>
            <div className="text-white/70 text-xs">Private Cloud · Media · Documents</div>
          </div>
        </motion.div>

        {/* Center hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 max-w-md"
        >
          <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight">
            Your private cloud,
            <br />
            <span className="text-white/90 italic font-light">beautifully secured.</span>
          </h1>
          <p className="text-white/80 mt-6 text-lg leading-relaxed">
            Stream videos, store photos, manage documents and contacts — all under your control, with bank-grade permission management.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {[
              { icon: Zap, label: "Fast uploads" },
              { icon: ShieldCheck, label: "Private mode" },
              { icon: Sparkles, label: "Premium UI" },
              { icon: QrCode, label: "QR login" },
            ].map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-white text-xs font-medium"
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 grid grid-cols-3 gap-4 max-w-md"
        >
          {[
            { v: "100%", l: "Private" },
            { v: "AES", l: "Encrypted" },
            { v: "24/7", l: "Available" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-3xl font-bold text-white">{s.v}</div>
              <div className="text-xs text-white/70 mt-1">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* === RIGHT: Auth form === */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Theme switcher */}
        <div className="absolute top-5 right-5 z-10 flex items-center gap-1 rounded-full glass-strong border shadow-premium p-1">
          <button onClick={() => setTheme("light")} className={cn("p-2 rounded-full transition-colors", theme === "light" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")} aria-label="Light theme">
            <Sun className="w-4 h-4" />
          </button>
          <button onClick={() => setTheme("dark")} className={cn("p-2 rounded-full transition-colors", theme === "dark" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")} aria-label="Dark theme">
            <Moon className="w-4 h-4" />
          </button>
          <button onClick={() => setTheme("system")} className={cn("p-2 rounded-full transition-colors", theme === "system" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground")} aria-label="System theme">
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {view === "admin-login" ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md"
            >
              <AdminLoginCard onBack={() => setView("user-login")} />
            </motion.div>
          ) : view === "qr-login" ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md"
            >
              <QRLoginPanel onBack={() => setView("user-login")} onSuccess={fetchSession} />
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md"
            >
              <UserLoginCard
                onTap={handleLoginAreaTap}
                tapProgress={tapProgress}
                onShowQR={() => setView("qr-login")}
                onSuccess={fetchSession}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function UserLoginCard({
  onTap,
  tapProgress,
  onShowQR,
  onSuccess,
}: {
  onTap: () => void;
  tapProgress: number;
  onShowQR: () => void;
  onSuccess: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Login failed");
        return;
      }
      toast.success("Welcome back!");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-premium-lg border-border/50 backdrop-blur-md bg-card/95 p-0 overflow-hidden">
      {/* Brand header — tappable for admin reveal */}
      <div
        onClick={onTap}
        onTouchStart={onTap}
        className="pt-10 pb-6 px-8 cursor-pointer select-none flex flex-col items-center gap-4 relative"
        role="button"
        aria-label="Login User"
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-20 h-20 rounded-3xl bg-brand-gradient flex items-center justify-center shadow-brand-lg"
        >
          <img src="/escloud-logo.svg" alt="Escloud" className="w-12 h-12" />
        </motion.div>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-brand-gradient">Escloud</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Private Cloud · Media · Documents · Contacts</p>
        </div>
        {/* Tap progress hint */}
        <AnimatePresence>
          {tapProgress > 0 && tapProgress < 10 && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: tapProgress / 10 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-muted overflow-hidden"
            >
              <div className="h-full brand-progress" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-8 pb-8">
        <form onSubmit={submit} className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1.5"
          >
            <Label htmlFor="identifier">Username or Email</Label>
            <div className="relative group">
              <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="you@example.com"
                className="pl-10 h-11 border-border/60 focus:border-primary/50 transition-colors"
                disabled={loading}
              />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-1.5"
          >
            <Label htmlFor="password">Password</Label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 border-border/60 focus:border-primary/50 transition-colors"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand-gradient text-white hover:opacity-95 shadow-brand btn-press text-base font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign In"
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5"
        >
          <Button
            type="button"
            variant="outline"
            onClick={onShowQR}
            className="w-full h-11 border-border/60 hover:bg-accent/40 transition-colors"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Scan QR to Login (PC)
          </Button>
        </motion.div>

      </div>
    </Card>
  );
}

function AdminLoginCard({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchSession = useAuthStore((s) => s.fetchSession);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    setLoading(true);
    try {
      const r = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.error ?? "Admin login failed");
        return;
      }
      toast.success("Administrator authenticated");
      fetchSession();
    } catch (e: any) {
      toast.error(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-premium-lg border-emerald-500/30 bg-card/95 backdrop-blur-md p-0 overflow-hidden">
      <div className="pt-8 pb-6 px-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 250, damping: 18 }}
          className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-brand"
        >
          <Shield className="w-7 h-7 text-emerald-500" />
        </motion.div>
        <h1 className="mt-4 text-2xl font-bold">Administrator Access</h1>
        <p className="text-xs text-muted-foreground mt-1.5">Restricted area · All actions are logged</p>
      </div>

      <div className="px-8 pb-8 space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-id">Admin Email or Username</Label>
            <Input
              id="admin-id"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="username"
              disabled={loading}
              className="h-11 border-border/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-pwd">Password</Label>
            <div className="relative">
              <Input
                id="admin-pwd"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="pr-10 h-11 border-border/60"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-brand btn-press">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
            Authenticate Administrator
          </Button>
        </form>

        <Button variant="ghost" onClick={onBack} className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to user login
        </Button>
      </div>
    </Card>
  );
}
