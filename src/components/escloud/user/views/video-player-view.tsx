"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useUIStore } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture2,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Settings,
  ChevronLeft,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
  Gauge,
} from "lucide-react";
import { saveWatchProgress, formatDuration } from "../../shared/use-media-list";
import type { ApiMediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerSettings {
  advancedPlay: boolean;
  preferredQuality: "auto" | "1080p" | "720p" | "480p";
  autoQuality: boolean;
  preBuffer: "adaptive" | "low" | "medium" | "high";
  dataSaver: boolean;
}

const DEFAULT_SETTINGS: PlayerSettings = {
  advancedPlay: true,
  preferredQuality: "auto",
  autoQuality: true,
  preBuffer: "adaptive",
  dataSaver: false,
};

export function VideoPlayerView() {
  const setView = useUIStore((s) => s.setView);
  const mediaId = useUIStore((s) => s.params.mediaId) as string;
  const [media, setMedia] = useState<ApiMediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlayerSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [playerState, setPlayerState] = useState<"preparing" | "loading" | "buffering" | "playing" | "paused" | "network-slow" | "ready" | "ended">("preparing");
  const [qualityLabel, setQualityLabel] = useState<string>("Auto");
  const [resumePosition, setResumePosition] = useState<number>(0);
  const [resumePrompt, setResumePrompt] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem("escloud-video-settings");
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("escloud-video-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    (async () => {
      if (!mediaId) return;
      setLoading(true);
      try {
        // Fetch via the list endpoint to get the media item
        const r = await fetch(`/api/media?recent=true&type=video&pageSize=200`);
        const d = await r.json();
        const found = d.items.find((m: any) => m.id === mediaId);
        if (!found) {
          // try without recent
          const r2 = await fetch(`/api/media?type=video&pageSize=200`);
          const d2 = await r2.json();
          const found2 = d2.items.find((m: any) => m.id === mediaId);
          if (found2) {
            setMedia(found2);
            setResumePosition(found2.watchProgress ?? 0);
            if (found2.watchProgress && found2.watchProgress > 5) setResumePrompt(true);
          } else {
            setError("Video not found or you don't have access.");
          }
        } else {
          setMedia(found);
          setResumePosition(found.watchProgress ?? 0);
          if (found.watchProgress && found.watchProgress > 5) setResumePrompt(true);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to load video");
      } finally {
        setLoading(false);
        setPlayerState("ready");
      }
    })();
  }, [mediaId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Preparing video…</p>
      </div>
    );
  }

  if (error || !media) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 p-6">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <p className="text-sm font-medium text-rose-500">{error ?? "Failed to load"}</p>
        <Button variant="outline" className="mt-4" onClick={() => setView("videos")}>
          <ChevronLeft className="w-4 h-4 mr-1.5" /> Back to videos
        </Button>
      </div>
    );
  }

  return (
    <VideoPlayer
      media={media}
      settings={settings}
      onSettingsChange={setSettings}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      playerState={playerState}
      setPlayerState={setPlayerState}
      qualityLabel={qualityLabel}
      setQualityLabel={setQualityLabel}
      resumePosition={resumePosition}
      resumePrompt={resumePrompt}
      setResumePrompt={setResumePrompt}
      onExit={() => setView("videos")}
    />
  );
}

interface PlayerProps {
  media: ApiMediaItem;
  settings: PlayerSettings;
  onSettingsChange: (s: PlayerSettings) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  playerState: string;
  setPlayerState: (s: any) => void;
  qualityLabel: string;
  setQualityLabel: (s: string) => void;
  resumePosition: number;
  resumePrompt: boolean;
  setResumePrompt: (v: boolean) => void;
  onExit: () => void;
}

function VideoPlayer({
  media,
  settings,
  onSettingsChange,
  showSettings,
  setShowSettings,
  playerState,
  setPlayerState,
  qualityLabel,
  setQualityLabel,
  resumePosition,
  resumePrompt,
  setResumePrompt,
  onExit,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(media.duration ?? 0);
  const [fullscreen, setFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [networkSlow, setNetworkSlow] = useState(false);
  const lastSavedRef = useRef(0);
  const hideControlsTimerRef = useRef<any>(null);
  const lastTapRef = useRef(0);

  // Resume playback
  const startFromResume = () => {
    setResumePrompt(false);
    if (videoRef.current && resumePosition) {
      videoRef.current.currentTime = resumePosition;
      videoRef.current.play().catch(() => {});
    }
  };

  const startFromBeginning = () => {
    setResumePrompt(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(10);
          break;
        case "j":
          seekRelative(-10);
          break;
        case "l":
          seekRelative(10);
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "0":
          videoRef.current.currentTime = 0;
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((v) => Math.min(1, v + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((v) => Math.max(0, v - 0.1));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  }, []);

  const seekRelative = useCallback((delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min((videoRef.current.duration || 0), videoRef.current.currentTime + delta));
  }, []);

  const seekTo = (t: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, t));
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Save watch progress periodically
  const saveProgress = useCallback(() => {
    if (!videoRef.current || !media) return;
    const pos = videoRef.current.currentTime;
    if (Math.abs(pos - lastSavedRef.current) < 5) return;
    lastSavedRef.current = pos;
    saveWatchProgress(media.id, pos, videoRef.current.duration || undefined);
  }, [media]);

  // Show/hide controls on mouse move
  const showControlsTemp = () => {
    setShowControls(true);
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (playing) {
      hideControlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  };

  // Network speed detection (simulated adaptive)
  useEffect(() => {
    if (!settings.advancedPlay) return;
    // Use Network Information API where available
    const nav = navigator as any;
    if (nav.connection) {
      const updateNet = () => {
        const conn = nav.connection;
        // Effective type: '4g' | '3g' | '2g' | 'slow-2g'
        if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g") {
          setNetworkSlow(true);
          setPlayerState("network-slow");
          setQualityLabel("240p");
        } else if (conn.effectiveType === "3g") {
          setNetworkSlow(false);
          setPlayerState("playing");
          setQualityLabel("480p");
        } else if (conn.effectiveType === "4g") {
          setNetworkSlow(false);
          setPlayerState("playing");
          setQualityLabel(settings.preferredQuality === "auto" ? "720p" : settings.preferredQuality);
        }
      };
      updateNet();
      nav.connection.addEventListener("change", updateNet);
      return () => nav.connection.removeEventListener("change", updateNet);
    }
  }, [settings.advancedPlay, settings.preferredQuality]);

  // Double-tap seek on mobile (and desktop double-click)
  const onSeekAreaClick = (e: React.MouseEvent, side: "left" | "right") => {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    if (delta < 300) {
      seekRelative(side === "left" ? -10 : 10);
      toast(side === "left" ? "−10s" : "+10s", { duration: 700 });
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  };

  const stateLabel = (() => {
    switch (playerState) {
      case "preparing": return "Preparing video…";
      case "loading": return "Loading";
      case "buffering": return "Buffering";
      case "network-slow": return "Network slow · quality adjusted";
      case "ready": return "Ready";
      case "ended": return "Ended";
      default: return playing ? "Playing" : "Paused";
    }
  })();

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top bar */}
      <div className={cn("absolute top-0 inset-x-0 z-20 transition-opacity px-3 py-3 pt-safe bg-gradient-to-b from-black/70 to-transparent", showControls ? "opacity-100" : "opacity-0")}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onExit}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-white text-sm font-medium truncate flex-1">{media.name}</div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Resume prompt */}
      {resumePrompt && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-md text-white rounded-xl px-4 py-3 flex items-center gap-3 border border-white/10">
          <span className="text-sm">Resume from {formatDuration(resumePosition)}?</span>
          <Button size="sm" onClick={startFromResume} className="bg-brand-gradient text-white">Resume</Button>
          <Button size="sm" variant="ghost" className="text-white" onClick={startFromBeginning}>Start over</Button>
        </div>
      )}

      {/* Player container */}
      <div
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center"
        onMouseMove={showControlsTemp}
        onClick={(e) => {
          // Click on center area toggles play; left/right double-click seeks
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x < rect.width / 3) onSeekAreaClick(e, "left");
          else if (x > rect.width * 2 / 3) onSeekAreaClick(e, "right");
          else togglePlay();
        }}
        onDoubleClick={toggleFullscreen}
      >
        <video
          ref={videoRef}
          src={`/api/media/${media.id}/stream`}
          className="w-full h-full object-contain"
          playsInline
          preload={settings.advancedPlay ? "metadata" : "none"}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || media.duration || 0);
            setPlayerState("ready");
          }}
          onPlay={() => { setPlaying(true); setPlayerState("playing"); showControlsTemp(); }}
          onPause={() => { setPlaying(false); setPlayerState("paused"); setShowControls(true); }}
          onWaiting={() => { setIsBuffering(true); setPlayerState("buffering"); }}
          onPlaying={() => { setIsBuffering(false); setPlayerState("playing"); }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
            // Save progress every 5 seconds
            if (Math.floor(e.currentTarget.currentTime) % 5 === 0) saveProgress();
          }}
          onEnded={() => { setPlayerState("ended"); saveProgress(); }}
          onError={() => { setPlayerState("loading"); }}
          crossOrigin="anonymous"
        />

        {/* Buffering spinner */}
        {(isBuffering || playerState === "buffering" || playerState === "loading" || playerState === "preparing") && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
        )}

        {/* Network slow indicator */}
        {networkSlow && playing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5" /> Slow network · quality reduced
          </div>
        )}

        {/* Center play/pause button */}
        {!playing && !isBuffering && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
              <Play className="w-10 h-10 text-white fill-white" />
            </div>
          </button>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="absolute top-14 right-3 z-30 bg-black/90 backdrop-blur-md text-white rounded-xl border border-white/10 p-4 w-72 space-y-3">
            <div className="font-semibold text-sm">Video Settings</div>
            <ToggleRow
              label="Advanced Video Play"
              desc="Smart preloading + adaptive quality"
              value={settings.advancedPlay}
              onChange={(v) => onSettingsChange({ ...settings, advancedPlay: v })}
            />
            <div className="space-y-1.5">
              <div className="text-xs text-white/70">Preferred quality</div>
              <Select value={settings.preferredQuality} onValueChange={(v) => onSettingsChange({ ...settings, preferredQuality: v as any })}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="480p">480p</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow label="Auto Quality" value={settings.autoQuality} onChange={(v) => onSettingsChange({ ...settings, autoQuality: v })} />
            <div className="space-y-1.5">
              <div className="text-xs text-white/70">Pre-buffer level</div>
              <Select value={settings.preBuffer} onValueChange={(v) => onSettingsChange({ ...settings, preBuffer: v as any })}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adaptive">Adaptive</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ToggleRow label="Data Saver" value={settings.dataSaver} onChange={(v) => onSettingsChange({ ...settings, dataSaver: v })} />
            <div className="border-t border-white/10 pt-2 flex items-center gap-1.5 text-[11px] text-white/60">
              <Gauge className="w-3 h-3" /> State: {stateLabel} · {qualityLabel}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className={cn("absolute bottom-0 inset-x-0 z-20 transition-opacity px-3 pb-3 pb-safe bg-gradient-to-t from-black/80 to-transparent", showControls ? "opacity-100" : "opacity-0")}>
        {/* Progress bar with thumbnail preview */}
        <div className="group relative mb-2">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 0}
            step={0.1}
            onValueChange={(v) => seekTo(v[0])}
            className="cursor-pointer"
          />
          <div className="text-[10px] text-white/60 mt-1 flex justify-between">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => seekRelative(-10)}>
            <SkipBack className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={togglePlay}>
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => seekRelative(10)}>
            <SkipForward className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-1 ml-1">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleMute}>
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                setMuted(v === 0);
                if (videoRef.current) {
                  videoRef.current.volume = v;
                  videoRef.current.muted = v === 0;
                }
              }}
              className="w-16 h-1 accent-white"
            />
          </div>

          <div className="text-white/80 text-xs ml-2 hidden sm:block">{stateLabel} · {qualityLabel}</div>

          <div className="ml-auto flex items-center gap-2">
            <Select value={String(playbackRate)} onValueChange={(v) => {
              setPlaybackRate(Number(v));
              if (videoRef.current) videoRef.current.playbackRate = Number(v);
            }}>
              <SelectTrigger className="w-16 h-8 bg-white/5 border-white/10 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">0.5×</SelectItem>
                <SelectItem value="0.75">0.75×</SelectItem>
                <SelectItem value="1">1×</SelectItem>
                <SelectItem value="1.25">1.25×</SelectItem>
                <SelectItem value="1.5">1.5×</SelectItem>
                <SelectItem value="2">2×</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={async () => {
                try {
                  if (videoRef.current) {
                    if ((videoRef.current as any).requestPictureInPicture) {
                      await (videoRef.current as any).requestPictureInPicture();
                    }
                  }
                } catch (e) { toast.error("PiP not supported"); }
              }}
            >
              <PictureInPicture2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-sm">{label}</div>
        {desc && <div className="text-[11px] text-white/50">{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn("relative w-10 h-5 rounded-full transition-colors", value ? "bg-emerald-500" : "bg-white/20")}
      >
        <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform", value && "translate-x-5")} />
      </button>
    </div>
  );
}
