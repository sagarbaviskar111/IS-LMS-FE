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
export default function YoutubePlayer({ videoId }: { videoId: string }) {
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
      className={styles.wrapper}
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
        </div>
      </div>
    </div>
  );
}
