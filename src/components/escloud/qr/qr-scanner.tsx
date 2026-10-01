"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onScanned: (token: string) => void;
}

export function QRScanner({ onClose, onScanned }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "verifying" | "success" | "error" | "denied">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCamera, setActiveCamera] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        // Stop the test stream — html5-qrcode will start its own
        stream.getTracks().forEach((t) => t.stop());
        if (!mounted) return;

        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader", { verbose: false });
        scannerRef.current = scanner;

        const cams = await Html5Qrcode.getCameras();
        if (!mounted) return;
        if (cams && cams.length > 0) {
          setCameras(cams);
          // Prefer back camera
          const back = cams.find((c) => /back|rear|environment/i.test(c.label)) ?? cams[cams.length - 1];
          setActiveCamera(back.id);
          await startScanner(back.id);
        } else {
          setStatus("error");
          setErrorMsg("No camera found on this device.");
        }
      } catch (e: any) {
        if (!mounted) return;
        console.error(e);
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
          setStatus("denied");
          setErrorMsg("Camera permission was denied. Please allow camera access in your browser settings to scan QR codes.");
        } else if (e?.name === "NotFoundError" || e?.name === "OverconstrainedError") {
          setStatus("error");
          setErrorMsg("No camera device is available.");
        } else {
          setStatus("error");
          setErrorMsg(e?.message ?? "Failed to start camera");
        }
      }
    })();

    return () => {
      mounted = false;
      stopScanner();
    };
  }, []);

  const startScanner = async (cameraId: string) => {
    if (!scannerRef.current) return;
    setStatus("scanning");
    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };
    await scannerRef.current.start(
      cameraId,
      config,
      async (decodedText: string) => {
        // QR detected
        setStatus("verifying");
        await stopScanner();
        await verifyToken(decodedText);
      },
      (err: any) => {
        // ignore per-frame failures
      }
    );
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {}
  };

  const verifyToken = async (rawToken: string) => {
    try {
      const r = await fetch("/api/auth/qr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: rawToken }),
      });
      const d = await r.json();
      if (!r.ok) {
        setStatus("error");
        setErrorMsg(d.error ?? "Invalid QR code");
        toast.error(d.error ?? "Invalid QR code");
        return;
      }
      setStatus("success");
      toast.success(d.message ?? "Login approved");
      setTimeout(() => onScanned(rawToken), 1200);
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Failed to verify QR code");
    }
  };

  const restart = async () => {
    await stopScanner();
    setStatus("loading");
    setErrorMsg("");
    // Reload camera
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader", { verbose: false });
      scannerRef.current = scanner;
      await startScanner(activeCamera || "environment");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e?.message ?? "Failed to restart");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 py-3 pt-safe bg-gradient-to-b from-black/70 to-transparent flex items-center justify-between">
        <div className="text-white text-sm font-medium">Scan QR Code</div>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Camera view */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div
          id="qr-reader"
          ref={containerRef}
          className="w-full max-w-md aspect-square overflow-hidden relative"
          style={{ display: status === "scanning" || status === "loading" ? "block" : "none" }}
        />

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="text-sm">Starting camera…</p>
            </div>
          </div>
        )}

        {/* Verifying overlay */}
        {status === "verifying" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur text-white">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 animate-spin" />
              <p className="text-sm">Verifying QR code…</p>
            </div>
          </div>
        )}

        {/* Success overlay */}
        {status === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur text-white">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
              <p className="text-sm font-medium">Login approved</p>
              <p className="text-xs text-white/60">The PC will sign in shortly.</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold">QR scan failed</h3>
            <p className="text-sm text-white/70 mt-2 max-w-xs">{errorMsg}</p>
            <Button variant="outline" className="mt-4 text-white border-white/30" onClick={restart}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try again
            </Button>
          </div>
        )}

        {/* Permission denied overlay */}
        {status === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold">Camera permission needed</h3>
            <p className="text-sm text-white/70 mt-2 max-w-xs">{errorMsg}</p>
            <Button variant="outline" className="mt-4 text-white border-white/30" onClick={restart}>
              <RefreshCw className="w-4 h-4 mr-2" /> Try again
            </Button>
          </div>
        )}

        {/* Camera switcher */}
        {status === "scanning" && cameras.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <select
              value={activeCamera}
              onChange={(e) => {
                setActiveCamera(e.target.value);
                startScanner(e.target.value);
              }}
              className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full border-0"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id} className="text-black">{c.label || c.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Helper text */}
      {status === "scanning" && (
        <div className="absolute bottom-4 inset-x-0 text-center text-white/70 text-xs px-6">
          Point your camera at the QR code shown on the PC login page.
        </div>
      )}
    </div>
  );
}
