"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, RefreshCw, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export function QRLoginPanel({ onBack, onSuccess }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "pending" | "ok" | "expired">("loading");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const pollRef = useRef<any>(null);
  const expireTimerRef = useRef<any>(null);

  const startNewQR = useCallback(async () => {
    setStatus("loading");
    setToken(null);
    if (pollRef.current) clearInterval(pollRef.current);
    if (expireTimerRef.current) clearInterval(expireTimerRef.current);
    try {
      const r = await fetch("/api/auth/qr/generate", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setToken(data.token);
      setExpiresAt(new Date(data.expiresAt).getTime());
      setSecondsLeft(Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)));
      setStatus("pending");
      // Poll for status (PC verifies)
      pollRef.current = setInterval(async () => {
        try {
          const r2 = await fetch(`/api/auth/qr/verify?token=${data.token}`);
          if (!r2.ok) {
            clearInterval(pollRef.current);
            setStatus("expired");
            return;
          }
          const d2 = await r2.json();
          if (d2.status === "ok") {
            clearInterval(pollRef.current);
            clearInterval(expireTimerRef.current);
            setStatus("ok");
            toast.success("Logged in via QR");
            setTimeout(() => onSuccess(), 700);
          }
        } catch {}
      }, 1500);
      // Countdown
      expireTimerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(pollRef.current);
            clearInterval(expireTimerRef.current);
            setStatus("expired");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start QR login");
      setStatus("expired");
    }
  }, [onSuccess]);

  useEffect(() => {
    startNewQR();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (expireTimerRef.current) clearInterval(expireTimerRef.current);
    };
  }, [startNewQR]);

  return (
    <Card className="shadow-xl border-border/60 bg-card/95 backdrop-blur-md">
      <CardHeader className="text-center pt-8">
        <div className="mx-auto w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="mt-3">Scan to Sign In</CardTitle>
        <CardDescription>Use the Escloud app on your phone to scan this code</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <div className="relative w-64 h-64 bg-white rounded-2xl border p-4 shadow-inner">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {status === "pending" && token && (
            <QRCodeCanvas value={`escloud-qr:${token}`} size={224} />
          )}
          {status === "ok" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-emerald-600">
              <CheckCircle2 className="w-16 h-16" />
              <p className="text-sm font-medium">Signed in</p>
            </div>
          )}
          {status === "expired" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <XCircle className="w-16 h-16 text-rose-500" />
              <p className="text-sm font-medium">QR expired</p>
              <Button variant="outline" onClick={startNewQR} size="sm">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> New code
              </Button>
            </div>
          )}
          {status === "pending" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-background border text-[11px] text-muted-foreground">
              Expires in {secondsLeft}s
            </div>
          )}
        </div>
        {status === "pending" && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Open the Escloud mobile app → tap the QR icon → point at this code.
            The QR contains a single-use token — never your password.
          </p>
        )}
      </CardContent>
      <CardFooter className="pb-6 flex justify-center">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </CardFooter>
    </Card>
  );
}

// Lightweight canvas QR renderer (no external lib needed for static use)
function QRCodeCanvas({ value, size }: { value: string; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    // Use a tiny SVG-based QR via dynamic import
    import("qrcode").then((QR) => {
      QR.toCanvas(canvasRef.current, value, { width: size, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } }, (err: any) => {
        if (err) console.error(err);
      });
    });
  }, [value, size]);
  return <canvas ref={canvasRef} />;
}
