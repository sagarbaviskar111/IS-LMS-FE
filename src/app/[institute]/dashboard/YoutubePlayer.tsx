"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./YoutubePlayer.module.css";

// Minimal surface of the YouTube IFrame Player API we actually use.
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTPlayerEvent {
  data: number;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (e: YTPlayerEvent) => void;
      };
    }
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiLoadPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  );
}

function FullscreenEnterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FullscreenExitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3v3a2 2 0 0 1-2 2H4M15 3v3a2 2 0 0 0 2 2h3M9 21v-3a2 2 0 0 0-2-2H4M15 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: "back" | "forward" }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: direction === "back" ? "scaleX(-1)" : undefined }}
    >
      <circle
        cx="12"
        cy="12.5"
        r="9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeDasharray="42 57"
        strokeLinecap="round"
        transform="rotate(-90 12 12.5)"
      />
      <polygon points="12,1 17.5,5.7 12,9.2" fill="currentColor" />
      <text x="12" y="16" fontSize="8.5" fontWeight="700" fill="currentColor" textAnchor="middle">
        10
      </text>
    </svg>
  );
}

// Custom-built player: the YouTube iframe itself is stripped of all its
// native UI (controls, logo, title, related videos) and made unclickable —
// every interaction goes through our own YouTube-styled overlay controls
// below, so nothing in the UI is a link a viewer could click through on.
// Safari (desktop and iOS) only exposes the Fullscreen API under a
// -webkit- prefix, and iOS Safari specifically refuses it altogether on
// anything but a <video> element — the pseudoFullscreen fallback below
// covers that case.
interface PrefixedFullscreenElement extends HTMLDivElement {
  webkitRequestFullscreen?: () => void;
}
interface PrefixedFullscreenDocument extends Document {
  webkitExitFullscreen?: () => void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
}

export default function YoutubePlayer({ videoId }: { videoId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const isFullscreen = nativeFullscreen || pseudoFullscreen;

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            setReady(true);
            setDuration(playerRef.current!.getDuration());
          },
          onStateChange: (e) => {
            if (cancelled) return;
            setPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    if (playing && !seeking) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current) setCurrent(playerRef.current.getCurrentTime());
      }, 250);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, seeking]);

  useEffect(() => {
    const doc = document as PrefixedFullscreenDocument;
    const onFullscreenChange = () => {
      const current = document.fullscreenElement || doc.webkitFullscreenElement;
      setNativeFullscreen(current === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const el = wrapperRef.current as PrefixedFullscreenElement | null;
    const doc = document as PrefixedFullscreenDocument;
    if (!el) return;

    const activeNativeFullscreen = document.fullscreenElement || doc.webkitFullscreenElement;
    if (activeNativeFullscreen) {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else doc.webkitExitFullscreen?.();
      return;
    }

    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }

    const fullscreenEnabled = doc.fullscreenEnabled || doc.webkitFullscreenEnabled;
    if (!fullscreenEnabled) {
      setPseudoFullscreen(true);
      return;
    }

    // requestFullscreen() can still reject at runtime even when the API is
    // reported as enabled (e.g. permissions policy) — fall back rather than
    // leave the button looking like it did nothing.
    const request = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.();
    Promise.resolve(request).catch(() => setPseudoFullscreen(true));
  };

  const wake = () => {
    setHovering(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHovering(false), 2500);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const skip = (delta: number) => {
    if (!playerRef.current) return;
    const next = Math.min(Math.max(playerRef.current.getCurrentTime() + delta, 0), duration || Infinity);
    playerRef.current.seekTo(next, true);
    setCurrent(next);
  };

  const controlsVisible = !playing || hovering;
  const percent = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapperRef}
      className={`${styles.wrapper} ${pseudoFullscreen ? styles.pseudoFullscreen : ""}`}
      onMouseEnter={wake}
      onMouseMove={wake}
      onMouseLeave={() => hideTimerRef.current && clearTimeout(hideTimerRef.current)}
      onClick={wake}
    >
      <div ref={containerRef} className={styles.videoArea} />
      {!ready && <div className={styles.loading}>Loading video...</div>}

      <div className={`${styles.overlay} ${controlsVisible ? "" : styles.overlayHidden}`}>
        <input
          type="range"
          className={styles.progress}
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          disabled={!ready}
          style={{ background: `linear-gradient(to right, #ff0000 ${percent}%, rgba(255,255,255,0.3) ${percent}%)` }}
          onChange={(e) => {
            setSeeking(true);
            setCurrent(Number(e.target.value));
          }}
          onMouseUp={(e) => {
            playerRef.current?.seekTo(Number((e.target as HTMLInputElement).value), true);
            setSeeking(false);
          }}
          onTouchEnd={(e) => {
            playerRef.current?.seekTo(Number((e.target as HTMLInputElement).value), true);
            setSeeking(false);
          }}
        />

        <div className={styles.controlRow}>
          <button className={styles.iconButton} onClick={togglePlay} disabled={!ready} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className={styles.iconButton} onClick={() => skip(-10)} disabled={!ready} aria-label="Back 10 seconds">
            <SkipIcon direction="back" />
          </button>
          <button className={styles.iconButton} onClick={() => skip(10)} disabled={!ready} aria-label="Forward 10 seconds">
            <SkipIcon direction="forward" />
          </button>
          <span className={styles.time}>
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <span style={{ flex: 1 }} />
          <button
            className={styles.iconButton}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
          </button>
        </div>
      </div>
    </div>
  );
}
